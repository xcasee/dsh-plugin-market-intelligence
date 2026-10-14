// -*- coding: utf-8 -*-
/**
 * Plugin load smoke test.
 *
 * Proves that `apply()` — the entry the loader calls once the tool registry is
 * available — registers the six tools, the persona section and the bundled
 * skill on a context, and that the bundled skill body is actually read from
 * `assets/` through `import.meta.url`. No DSH runtime is booted, so this runs
 * anywhere `lib/` exists.
 */
import { CaseeClient, CaseeApiError } from '../lib/index.js';
import * as plugin from '../lib/index.js';

const CONFIG = {
  apiBaseUrl: 'http://127.0.0.1:1',
  apiKeyEnv: 'CASEE_API_KEY',
  defaultDays: 30,
  defaultMinTscore: 0.6,
  maxLimit: 200,
  timeoutMs: 1000,
  requestIntervalMs: 0,
  registerSkill: true,
  registerPrompt: true,
  platformUrl: 'https://casee.me',
  outputLanguage: 'auto',
};

const registered = [];
const sections = [];
const skills = [];
const injections = [];

const ctx = {
  tools: {
    register(definition) {
      registered.push(definition);
      return () => {};
    },
  },
  inject(deps, callback) {
    injections.push(deps.join('+'));
    callback(ctx);
    return () => {};
  },
  systemPrompt: {
    section(section) {
      sections.push(section);
      return () => {};
    },
  },
  skills: {
    register(skill) {
      skills.push(skill);
      return () => {};
    },
  },
};

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

plugin.apply(ctx, CONFIG);

check('plugin name', plugin.name === 'market-intelligence', plugin.name);
check('inject declares tools', Array.isArray(plugin.inject) && plugin.inject.includes('tools'));
check('six tools registered', registered.length === 6, `got ${registered.length}`);
check(
  'tool names match the contract',
  JSON.stringify(registered.map((t) => t.name).sort()) === JSON.stringify([...plugin.TOOL_NAMES].sort()),
  registered.map((t) => t.name).join(','),
);
check('every tool declares a canonical output schema + render', registered.every((t) => t.output?.schema && typeof t.output.render === 'function'));
check('every tool declares a non-empty description', registered.every((t) => typeof t.description === 'string' && t.description.length > 40));

check('persona section registered', sections.length === 1 && sections[0].name === plugin.PROMPT_SECTION, sections.map((s) => s.name).join(','));
const promptText = sections[0]?.text?.({}) ?? '';
check('persona text is substantive', promptText.length > 800 && promptText.includes('T-Score') && promptText.includes('Iron rules'), `len=${promptText.length}`);
check('persona order sits after the deployment persona', sections[0]?.order > 0 && sections[0]?.order < 100, `order=${sections[0]?.order}`);

check('skill registered', skills.length === 1 && skills[0].name === plugin.SKILL_NAME, skills.map((s) => s.name).join(','));
const skill = skills[0] ?? {};
check('skill body loaded from assets', typeof skill.content === 'string' && skill.content.includes('# CaSee 市场情报分析技能'), `len=${skill.content?.length}`);
check('skill references its analysis docs', skill.content?.includes('analysis/report_style.md'));
check('skill exposes a resource base', skill.resourceBase?.kind === 'directory' && skill.resourceBase.path.endsWith('market-intelligence/'), skill.resourceBase?.path);
check('skill is model- and user-invocable', skill.invocation?.modelInvocable === true && skill.invocation?.userInvocable === true);

check('optional capabilities awaited via inject', injections.includes('systemPrompt') && injections.includes('skills'), injections.join(','));

check('client + error exported for embedders', typeof CaseeClient === 'function' && typeof CaseeApiError === 'function');

const passed = checks.filter((c) => c.ok).length;
console.log('\n=== 插件装载冒烟测试 (apply → ctx) ===');
for (const c of checks) console.log(`${c.ok ? '  PASS' : '  FAIL'}  ${c.name}${c.ok ? '' : `  — ${c.detail}`}`);
console.log(`\n结果：${passed}/${checks.length} 通过`);
if (passed !== checks.length) process.exitCode = 1;
