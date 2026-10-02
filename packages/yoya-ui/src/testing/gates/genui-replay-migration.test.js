/**
 * 重放迁移清单（票集 `genui-wiring` 票 04）——**只减不增**。
 *
 * 打开 `replay: 'declared'` 之后，只有两类位还能拿到数据：**值通道**（代码里归一过，
 * 扫进插件的 `valueProps`）与**显式命令通道**（`to=command:x`）。两者都不是的位会停在
 * 构建期那份快照 —— 那就是必须迁移的清单，也正是票 05–11 的分批表。
 *
 * 这份清单从**生成的插件**派生（`valueProps` + `props[].to`），不看源码猜；没在插件 props
 * 表里声明过的位（单参 props 袋的库）由 `genui-props-parity.test.js` 的 `declaredOnly` 基线兜。
 *
 * 迁移一刀后用
 * `UPDATE_GENUI_REPLAY_BASELINE=1 npx vitest run src/testing/gates/genui-replay-migration.test.js`
 * 下调基线。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { components } from '@yoyaflow/yoya-ui/genui-plugin';

const BASELINE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../baselines/genui-replay-migration.json'
);

/** `props` 映射声明的通道：字符串（`label` / `command:value`）或 `{ to }`。 */
function channelOf(mapping) {
  const target = typeof mapping === 'string' ? mapping : (mapping?.to ?? '');
  const colon = target.indexOf(':');
  return colon === -1 ? 'prop' : target.slice(0, colon);
}

/** 依赖"构建期喂一次 + 数据变化重放"的位：既没归一、也没声明命令通道。 */
export function collectReplayMigration(entries = components) {
  const legacy = [];

  Object.entries(entries).forEach(([name, entry]) => {
    const valueProps = new Set(entry.valueProps ?? []);

    Object.entries(entry.props ?? {}).forEach(([prop, mapping]) => {
      if (valueProps.has(prop)) {
        return; // 值通道
      }

      const channel = channelOf(mapping);

      // 命令通道照旧重放；attr / style / class 走元素面，不经过这条通道
      if (channel === 'command' || channel === 'attr' || channel === 'style' || channel === 'class') {
        return;
      }

      legacy.push(`${name}#${prop}`);
    });
  });

  return legacy.sort();
}

describe('重放迁移清单（票 04）', () => {
  it('只减不增：出现新的待迁移位就红', () => {
    const current = collectReplayMigration();

    if (process.env.UPDATE_GENUI_REPLAY_BASELINE === '1') {
      writeFileSync(BASELINE_FILE, `${JSON.stringify({ entries: current }, null, 2)}\n`);
    }

    const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
    const added = current.filter((entry) => !baseline.entries.includes(entry));

    expect(added).toEqual([]);
  });
});
