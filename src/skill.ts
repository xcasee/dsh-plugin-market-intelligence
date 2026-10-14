/**
 * Bundled market-intelligence skill.
 *
 * The skill body ships as Markdown under `assets/` and is registered as a
 * runtime skill, so the model can pull the full methodology (and its reference
 * documents, resolved relative to `resourceBase`) on demand instead of paying
 * for it in every system prompt.
 *
 * @module dsh-plugin-market-intelligence/skill
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
// Side-effect import: loads the `ctx.skills` declaration merging.
import '@deepseek-ai/dsh-skill'
import type { Config } from './config.js'

/** Skill name advertised to the model and the `/` command surface. */
export const SKILL_NAME = 'market-intelligence'

/** Absolute path of the bundled skill directory, used to resolve relative docs. */
export function skillResourceDir(): string {
  return fileURLToPath(new URL('../assets/skills/market-intelligence/', import.meta.url))
}

const SKILL_DESCRIPTION =
  'CaSee 市场情报分析方法学：两阶段可信检索、T-Score/ABCD 可信度分级、市场/竞争/客户三类分析工作流，以及 CaSee 深色看板 HTML 报告的完整样式与图表规范。'

const SKILL_WHEN_TO_USE =
  '当用户询问市场规模与格局、行业趋势、竞争对手动态、客户需求与痛点，或需要可溯源的市场情报报告与图表时使用。'

/**
 * Register the bundled skill on the skill registry. The body is read once at
 * load; the registration unwinds with the plugin fiber.
 * @param ctx - a context carrying `skills`.
 * @param _config - resolved plugin configuration (reserved for future gating).
 */
export function registerSkill(ctx: Context, _config: Config): void {
  const content = readFileSync(
    new URL('../assets/skills/market-intelligence/SKILL.md', import.meta.url),
    'utf8',
  )
  ctx.skills.register({
    name: SKILL_NAME,
    description: SKILL_DESCRIPTION,
    whenToUse: SKILL_WHEN_TO_USE,
    source: 'bundled',
    content,
    resourceBase: { kind: 'directory', path: skillResourceDir() },
    invocation: { modelInvocable: true, userInvocable: true },
  })
}
