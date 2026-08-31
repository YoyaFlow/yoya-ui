import { vButton, vCard, vColorPicker, vText, vThemeModeSwitch } from '../index.js';

function densityButton(compact, densityText) {
  return vButton('切换密度')
    .attr('data-theme-density', '')
    .on('click', () => {
      compact.value = !compact.value;
      if (compact.value) {
        document.documentElement.dataset.yoyaDensity = 'compact';
        densityText.textContent('密度：紧凑');
      } else {
        delete document.documentElement.dataset.yoyaDensity;
        densityText.textContent('密度：舒适');
      }
    });
}

function accentInput() {
  return vColorPicker((picker) => {
    picker.attr('data-theme-accent', '');
    picker.onChange((color) => {
      document.documentElement.style.setProperty('--yoya-raw-primary', color);
    });
  });
}

/**
 * 主题切换演示：明暗模式、紧凑密度、品牌主色（raw 覆盖）。
 */
export function renderThemeDemo() {
  const densityText = vText('密度：舒适');
  const compact = { value: false };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('主题切换');
        card.vCardBody((body) => {
          body.p('点击按钮切换主题模式，切换后自动保存（刷新页面由 initYoyaTheme 恢复）');
          body.child(vThemeModeSwitch({ persist: true }));
          body.p(densityText);
          body.child(densityButton(compact, densityText));
          body.p('品牌主色（覆盖 --yoya-raw-primary）');
          body.child(accentInput());
        });
      });
    }
  };
}
