import { ref, vButton, vCard, vColorPicker, vText, vThemeModeSwitch } from '@yoyaflow/yoya-ui';

/**
 * 主题切换演示：明暗模式、紧凑密度、品牌主色（raw 覆盖）。
 */
export function renderThemeDemo() {
  const densityText = ref('密度：舒适');
  const compact = { value: false };
  const densityButton = () =>
    vButton('切换密度')
      .attr('data-theme-density', '')
      .on('click', () => {
        compact.value = !compact.value;
        const density = compact.value ? 'compact' : null;
        densityText.value = compact.value ? '密度：紧凑' : '密度：舒适';
        if (density) {
          document.documentElement.dataset.yoyaDensity = density;
        } else {
          delete document.documentElement.dataset.yoyaDensity;
        }
      });
  const accentInput = () =>
    vColorPicker((picker) => {
      picker.attr('data-theme-accent', '');
      picker.onChange((color) => {
        document.documentElement.style.setProperty('--yoya-raw-primary', color);
      });
    });

  return vCard((card) => {
    card.vCardHeader('主题切换');
    card.vCardBody((body) => {
      body.p('选择明暗模式后自动保存，刷新页面由 initYoyaTheme 恢复。');
      body.child(vThemeModeSwitch({ persist: true }));
      body.p(vText(densityText));
      body.child(densityButton());
      body.p('品牌主色（覆盖 --yoya-raw-primary）');
      body.child(accentInput());
    });
  });
}
