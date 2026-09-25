/**
 * 静态值折叠的夹具（编译覆盖度）：形态 A 的叶子组件，静态值来自 core 的
 * 主题助手（组件作者契约）——构建期要把它们算成字面量，片段才进得了编译产物。
 * 不是演示代码、也不随包发布。
 */
import { span, vText } from '@yoyaflow/yoya-core';
import { themeBorder, themeValue } from '@yoyaflow/yoya-core/tools';

const TAG_CLASS = 'yoya-theme-tag';

export function ThemeTag(props) {
  return span((tag) => {
    tag.className(TAG_CLASS);
    tag.style('background', themeValue('color-surface', '#ffffff'));
    tag.style('border', themeBorder('color-border', '#d8dee8'));
    tag.attr('data-tone', props.tone);
    tag.child(vText(props.label));
  });
}
