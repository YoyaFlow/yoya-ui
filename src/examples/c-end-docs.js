import {
  div,
  hstack,
  section,
  vCard,
  vImagePreview,
  vLazyImage,
  vMasonry,
  vSkeleton,
  vTransition
} from '../index.js';
import { ComponentSource } from './component-source.js';

const SVG_SMALL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="100%" height="100%" fill="#93b4ff"/></svg>'
  );
const SVG_BIG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="100%" height="100%" fill="#4b7bec"/><text x="50%" y="50%" fill="#ffffff" font-size="42" text-anchor="middle" dy=".35em">大图预览</text></svg>'
  );

// ---- 演示内容（不含 Card，进入源码面板） ----

function SkeletonBasicExample() {
  return vSkeleton({ rows: 4 });
}

function SkeletonVariantsExample() {
  return hstack({ gap: '24px' }, (row) => {
    row.style('alignItems', 'flex-start');
    row.vSkeleton({ avatarSize: 64, variant: 'avatar' });
    row.vSkeleton({ rows: 3 });
    row.vSkeleton({ variant: 'block' });
  });
}

function SkeletonToggleExample() {
  const skeleton = vSkeleton({ rows: 3 });
  let contentAttached = false;

  return {
    render() {
      return div((root) => {
        root.style('width', '100%');
        root.child(skeleton);
      });
    },
    loaded() {
      if (contentAttached) {
        return;
      }

      contentAttached = true;
      skeleton.active(false);
      skeleton.vstack((stack) => {
        stack.h3('订单 #1024');
        stack.p('数据加载完成，这里展示真实内容；再次点击回到骨架屏。');
      });
    },
    loading() {
      contentAttached = false;
      skeleton.active(true);
    }
  };
}

function LazyImageBasicExample() {
  return vLazyImage({ alt: '懒加载示例', src: SVG_BIG });
}

function LazyImageErrorExample() {
  return vLazyImage({ alt: '失败示例', src: '/missing-image.png' });
}

function TransitionToggleExample() {
  const transition = vTransition({
    children: div((block) => {
      block.styles({
        background: 'var(--yoya-color-primary-subtle, #dbeafe)',
        border: '1px solid var(--yoya-color-primary, #2563eb)',
        borderRadius: '8px',
        boxSizing: 'border-box',
        color: 'var(--yoya-color-primary, #2563eb)',
        fontWeight: '700',
        padding: '16px'
      });
      block.text('这是过渡动画包裹的内容，支持 enter / leave 进出场。');
    })
  });

  return {
    render() {
      return div((root) => {
        root.style('width', '100%');
        root.child(transition);
      });
    },
    toggle() {
      transition.toggle();
    }
  };
}

function TransitionMotionExample() {
  return hstack({ gap: '16px' }, (row) => {
    row.vTransition({ children: 'motion: auto（跟随系统减少动态效果）' });
    row.vTransition({ children: 'motion: always（强制动画）', motion: 'always' });
  });
}

function TransitionForceExample() {
  const transition = vTransition({
    children: div((block) => {
      block.styles({
        background: 'var(--yoya-color-primary-subtle, #dbeafe)',
        border: '1px solid var(--yoya-color-primary, #2563eb)',
        borderRadius: '8px',
        boxSizing: 'border-box',
        color: 'var(--yoya-color-primary, #2563eb)',
        fontWeight: '700',
        padding: '16px'
      });
      block.text('强制动画内容块：即使系统开启“减少动态效果”也始终播放。');
    }),
    motion: 'always'
  });

  return {
    render() {
      return div((root) => {
        root.style('width', '100%');
        root.child(transition);
      });
    },
    toggle() {
      transition.toggle();
    }
  };
}

const masonryItems = [
  { color: '#dbeafe', height: '120px', text: '卡片 A' },
  { color: '#dcfce7', height: '180px', text: '卡片 B' },
  { color: '#fef9c3', height: '100px', text: '卡片 C' },
  { color: '#fee2e2', height: '160px', text: '卡片 D' },
  { color: '#ede9fe', height: '130px', text: '卡片 E' },
  { color: '#cffafe', height: '200px', text: '卡片 F' }
];

const masonryPalette = ['#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2', '#ede9fe', '#cffafe'];

const masonryScrollItems = Array.from({ length: 24 }, (_, index) => ({
  color: masonryPalette[index % masonryPalette.length],
  height: `${96 + ((index * 37) % 132)}px`,
  text: `卡片 ${index + 1}`
}));

function MasonryFixedExample() {
  return vMasonry({ columns: 3, gap: 16 }, (masonry) => {
    masonryItems.forEach((item) => {
      masonry.div((card) => {
        card.style({
          background: item.color,
          borderRadius: '8px',
          boxSizing: 'border-box',
          height: item.height,
          padding: '12px'
        });
        card.text(item.text);
      });
    });
  });
}

function MasonryResponsiveExample() {
  return vMasonry({ gap: 16, minColumnWidth: 220 }, (masonry) => {
    masonryItems.forEach((item) => {
      masonry.div((card) => {
        card.style({
          background: item.color,
          borderRadius: '8px',
          boxSizing: 'border-box',
          height: item.height,
          padding: '12px'
        });
        card.text(item.text);
      });
    });
  });
}

function MasonryScrollExample() {
  return div((root) => {
    root.attr('data-masonry-scroll', 'true');
    root.styles({
      border: '1px solid var(--yoya-color-border-faint, #e5e5e5)',
      borderRadius: '8px',
      boxSizing: 'border-box',
      height: '480px',
      overflow: 'auto',
      padding: '12px'
    });
    root.vMasonry({ columns: 3, gap: 16 }, (masonry) => {
      masonryScrollItems.forEach((item) => {
        masonry.div((card) => {
          card.style({
            background: item.color,
            borderRadius: '8px',
            boxSizing: 'border-box',
            height: item.height,
            padding: '12px'
          });
          card.text(item.text);
        });
      });
    });
  });
}

function ImagePreviewBasicExample() {
  return vImagePreview({ alt: '预览示例', src: SVG_BIG, thumb: SVG_SMALL });
}

// ---- 页面壳（Card + 说明 + 操作按钮，不进入源码面板） ----

function SkeletonBasicDemo() {
  const content = SkeletonBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础骨架屏');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('段落骨架屏用于内容区块加载占位，数据到达后替换为真实内容。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function SkeletonVariantsDemo() {
  const content = SkeletonVariantsExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('形态与尺寸');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('avatar、paragraph、block 三种形态可组合，avatarSize 控制头像尺寸。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function SkeletonToggleDemo() {
  const content = SkeletonToggleExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('加载完成切换');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('active(false) 移除占位并挂载真实内容，active(true) 回到骨架屏。');
            stack.child(content);
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack({ gap: '10px' }, (row) => {
            row.vButton((button) => {
              button.label('切换为真实内容');
              button.variant('primary');
              button.on('click', () => content.loaded());
            });
            row.vButton((button) => {
              button.label('回到骨架屏');
              button.on('click', () => content.loading());
            });
          });
        });
      });
    }
  };
}

function LazyImageBasicDemo() {
  const content = LazyImageBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础懒加载');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('进入视口才加载，加载中显示占位，加载完成淡入显示。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function LazyImageErrorDemo() {
  const content = LazyImageErrorExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('失败与重试');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('加载失败显示失败态，点击“加载失败，点击重试”可重新请求。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function TransitionToggleDemo() {
  const content = TransitionToggleExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('进出场切换');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('show(false) 播放离开动画后隐藏，show(true) 重新进入。');
            stack.child(content);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('切换显示');
            button.variant('primary');
            button.on('click', () => content.toggle());
          });
        });
      });
    }
  };
}

function TransitionMotionDemo() {
  const content = TransitionMotionExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动效策略');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('auto 遵循系统减少动态效果偏好，always 强制运行动画。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function TransitionForceDemo() {
  const content = TransitionForceExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('强制动画');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('motion: always 不跟随系统“减少动态效果”偏好，进出场始终播放动画。');
            stack.child(content);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('切换显示');
            button.variant('primary');
            button.on('click', () => content.toggle());
          });
        });
      });
    }
  };
}

function MasonryFixedDemo() {
  const content = MasonryFixedExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('固定列数');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('columns 指定列数，gap 控制间距，子项按顺序落入各列。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function MasonryResponsiveDemo() {
  const content = MasonryResponsiveExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('响应式列宽');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('minColumnWidth 设置最小列宽，列数随容器宽度自动调整。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function MasonryScrollDemo() {
  const content = MasonryScrollExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('滚动查看更多');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('24 张卡片放入固定高度容器，滚动即可查看后续内容，瀑布流列数保持一致。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function ImagePreviewBasicDemo() {
  const content = ImagePreviewBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础灯箱');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('点击缩略图打开灯箱，大图懒加载，支持缩放、平移、ESC 关闭。');
            stack.child(content);
          });
        });
      });
    }
  };
}

// ---- 页面定义 ----

const cEndDocsDefinitions = Object.freeze({
  skeleton: createCEndDocsDefinition({
    apiIntro:
      'vSkeleton 是加载占位组件，数据未到达时用骨架屏占位，active(false) 后切换为真实内容。动画遵循 reduced-motion。',
    apiRows: [
      ['vSkeleton()', '创建段落骨架屏，默认 3 行。', 'vSkeleton()'],
      [
        "skeleton.variant('paragraph' | 'avatar' | 'block')",
        '切换段落 / 头像 / 区块形态。',
        "skeleton.variant('avatar')"
      ],
      ['skeleton.rows(value)', '设置段落行数。', 'skeleton.rows(5)'],
      [
        'skeleton.barHeight(value)',
        '设置文字占位行高（px），接近真实文字行盒高度可避免切换时跳动。',
        'skeleton.barHeight(20)'
      ],
      [
        'skeleton.gap(value)',
        '设置行与行之间的间距（px），与 barHeight 共同决定段落占位总高。',
        'skeleton.gap(8)'
      ],
      ['skeleton.avatarSize(value)', '设置头像尺寸（px）。', 'skeleton.avatarSize(64)'],
      [
        'skeleton.active(value)',
        'true 显示占位，false 移除占位并展示真实内容。',
        'skeleton.active(false)'
      ],
      [
        "skeleton.motion('auto' | 'always')",
        '动画策略：auto 跟随系统减少动态效果。',
        "skeleton.motion('auto')"
      ]
    ],
    apiSignature: `vSkeleton({ variant: 'paragraph', rows: 3, motion: 'auto' })`,
    examples: [
      {
        component: SkeletonBasicDemo,
        description: '段落骨架屏用于内容区块加载占位。',
        id: 'basic',
        imports: ['vSkeleton'],
        sourceComponent: SkeletonBasicExample,
        sourceTitle: '基础骨架屏核心源码',
        title: '基础骨架屏'
      },
      {
        component: SkeletonVariantsDemo,
        description: 'avatar、paragraph、block 三种形态可自由组合。',
        id: 'variants',
        imports: ['hstack', 'vSkeleton'],
        sourceComponent: SkeletonVariantsExample,
        sourceTitle: '形态与尺寸核心源码',
        title: '形态与尺寸'
      },
      {
        component: SkeletonToggleDemo,
        description: 'active(false) 后挂载真实内容，active(true) 回到骨架屏。',
        id: 'toggle',
        imports: ['div', 'vSkeleton'],
        sourceComponent: SkeletonToggleExample,
        sourceTitle: '加载完成切换核心源码',
        title: '加载完成切换'
      }
    ],
    heading: 'vSkeleton 骨架屏',
    intro: '骨架屏在数据加载期间提供占位视觉，降低等待感，加载完成后无缝切换为真实内容。',
    key: 'skeleton',
    routeItem: 'c-end:0',
    title: '骨架屏',
    usageItems: [
      '列表、详情或卡片内容需要异步加载时，用骨架屏代替空白区域。',
      '需要复用同一容器在加载态与内容态之间切换时，用 active 控制。'
    ]
  }),
  lazyImage: createCEndDocsDefinition({
    apiIntro:
      'vLazyImage 是图片懒加载组件：进入视口才加载，原生 loading="lazy" 兜底，提供加载中、加载成功、加载失败三种状态。',
    apiRows: [
      ['vLazyImage({ src, alt })', '创建懒加载图片。', 'vLazyImage({ src: "/a.png" })'],
      ['image.src(value)', '设置图片地址。', 'image.src("/a.png")'],
      ['image.alt(value)', '设置替代文本。', 'image.alt("示例")'],
      ['image.defer(value)', '开启 IntersectionObserver 延迟加载。', 'image.defer(true)'],
      ['image.state()', '读取 loading / loaded / error 状态。', 'image.state()'],
      ['image.retry()', '失败后重新加载。', 'image.retry()']
    ],
    apiSignature: `vLazyImage({
  src: '/cover.png',
  alt: '封面',
  defer: true
})`,
    examples: [
      {
        component: LazyImageBasicDemo,
        description: '进入视口才加载，加载完成后淡入显示。',
        id: 'basic',
        imports: ['vLazyImage'],
        sourceComponent: LazyImageBasicExample,
        sourceTitle: '基础懒加载核心源码',
        title: '基础懒加载'
      },
      {
        component: LazyImageErrorDemo,
        description: '加载失败显示失败态与重试按钮。',
        id: 'error',
        imports: ['vLazyImage'],
        sourceComponent: LazyImageErrorExample,
        sourceTitle: '失败与重试核心源码',
        title: '失败与重试'
      }
    ],
    heading: 'vLazyImage 图片懒加载',
    intro: '图片进入视口才发起加载，减少首屏流量，长列表和内容站点场景开箱即用。',
    key: 'lazy-image',
    routeItem: 'c-end:1',
    title: '懒加载图片',
    usageItems: [
      '长列表、内容流或首屏以下的大图需要延迟加载时。',
      '需要统一的加载占位与失败重试体验时。'
    ]
  }),
  transition: createCEndDocsDefinition({
    apiIntro:
      'vTransition 是通用进出场过渡组件，CSS 类驱动 enter / leave，动画遵循 reduced-motion。',
    apiRows: [
      ['vTransition({ children })', '创建过渡容器。', 'vTransition({ children: div("内容") })'],
      [
        'transition.show(value)',
        'true 播放进入，false 播放离开并在动画结束后隐藏。',
        'transition.show(false)'
      ],
      [
        'transition.enter() / leave() / toggle()',
        '进入、离开或切换显示状态。',
        'transition.toggle()'
      ],
      [
        "transition.motion('auto' | 'always')",
        '动画策略：auto 跟随系统减少动态效果；always 通过 Web Animations API 强制播放，不受系统设置影响。',
        "transition.motion('always')"
      ],
      ['transition.duration(value)', '设置过渡时长（ms）。', 'transition.duration(320)']
    ],
    apiSignature: `vTransition({ motion: 'auto' }, (transition) => {
  transition.vCard((card) => card.vCardBody((body) => body.p('内容')));
})`,
    examples: [
      {
        component: TransitionToggleDemo,
        description: 'show(false) 播放离开动画后隐藏，show(true) 重新进入。',
        id: 'toggle',
        imports: ['div', 'vTransition'],
        sourceComponent: TransitionToggleExample,
        sourceTitle: '进出场切换核心源码',
        title: '进出场切换'
      },
      {
        component: TransitionMotionDemo,
        description: 'auto 遵循系统减少动态效果偏好，always 强制动画。',
        id: 'motion',
        imports: ['hstack', 'vTransition'],
        sourceComponent: TransitionMotionExample,
        sourceTitle: '动效策略核心源码',
        title: '动效策略'
      },
      {
        component: TransitionForceDemo,
        description: 'motion: always 强制运行动画，不跟随系统减少动态效果偏好。',
        id: 'force',
        imports: ['div', 'vTransition'],
        sourceComponent: TransitionForceExample,
        sourceTitle: '强制动画核心源码',
        title: '强制动画'
      }
    ],
    heading: 'vTransition 通用过渡',
    intro: '为任意内容块提供统一的进出场动画，适合弹层、插卡、列表项等场景。',
    key: 'transition',
    routeItem: 'c-end:2',
    title: '过渡动效',
    usageItems: [
      '弹层、插卡、列表项等需要统一的进出场动画时。',
      '需要在系统减少动态效果偏好下自动降级时。'
    ]
  }),
  masonry: createCEndDocsDefinition({
    apiIntro: 'vMasonry 是瀑布流布局组件，基于 CSS 多列实现，列数、间距与最小列宽可配置。',
    apiRows: [
      ['vMasonry({ columns, gap })', '创建固定列数瀑布流。', 'vMasonry({ columns: 3, gap: 16 })'],
      ['masonry.columns(value)', '设置列数。', 'masonry.columns(4)'],
      ['masonry.gap(value)', '设置列间距（px）。', 'masonry.gap(24)'],
      [
        'masonry.minColumnWidth(value)',
        '设置最小列宽，列数随容器宽度自动调整。',
        'masonry.minColumnWidth(220)'
      ]
    ],
    apiSignature: `vMasonry({ columns: 3, gap: 16 }, (masonry) => {
  masonry.div('卡片 1');
  masonry.div('卡片 2');
})`,
    examples: [
      {
        component: MasonryFixedDemo,
        description: 'columns 固定列数，子项按顺序落入各列。',
        id: 'fixed',
        imports: ['vMasonry'],
        sourceComponent: MasonryFixedExample,
        sourceTitle: '固定列数核心源码',
        title: '固定列数'
      },
      {
        component: MasonryResponsiveDemo,
        description: 'minColumnWidth 让列数随容器宽度自动调整。',
        id: 'responsive',
        imports: ['vMasonry'],
        sourceComponent: MasonryResponsiveExample,
        sourceTitle: '响应式列宽核心源码',
        title: '响应式列宽'
      },
      {
        component: MasonryScrollDemo,
        description: '固定高度容器内滚动查看更多卡片，瀑布流列数保持一致。',
        id: 'scroll',
        imports: ['div', 'vMasonry'],
        sourceComponent: MasonryScrollExample,
        sourceTitle: '滚动查看更多核心源码',
        title: '滚动查看更多'
      }
    ],
    heading: 'vMasonry 瀑布流',
    intro: '瀑布流用于图片墙、商品卡、内容流等高度不一的卡片布局。',
    key: 'masonry',
    routeItem: 'c-end:3',
    title: '瀑布流',
    usageItems: [
      '图片墙、商品卡、内容流等高度不一的卡片布局。',
      '需要列数随容器宽度自适应时，用 minColumnWidth。'
    ]
  }),
  imagePreview: createCEndDocsDefinition({
    apiIntro:
      'vImagePreview 是图片预览灯箱：点击缩略图打开浮层，大图懒加载，支持缩放、平移、ESC 与按钮关闭。',
    apiRows: [
      [
        'vImagePreview({ src, thumb, alt })',
        '创建图片预览，thumb 为缩略图，src 为大图。',
        'vImagePreview({ src: "/big.png", thumb: "/small.png" })'
      ],
      ['preview.open() / close() / toggle()', '打开、关闭或切换灯箱。', 'preview.open()'],
      ['preview.zoom(value)', '设置缩放倍数（1–5）。', 'preview.zoom(2)'],
      ['preview.resetZoom()', '重置缩放与平移。', 'preview.resetZoom()'],
      ['preview.state()', '读取 open / closed 状态。', 'preview.state()']
    ],
    apiSignature: `vImagePreview({
  src: '/big.png',
  thumb: '/small.png',
  alt: '示例'
})`,
    examples: [
      {
        component: ImagePreviewBasicDemo,
        description: '点击缩略图打开灯箱，大图懒加载并支持缩放平移。',
        id: 'basic',
        imports: ['vImagePreview'],
        sourceComponent: ImagePreviewBasicExample,
        sourceTitle: '基础灯箱核心源码',
        title: '基础灯箱'
      }
    ],
    heading: 'vImagePreview 图片预览',
    intro: '商品图、内容配图等场景点击放大查看，浮层定位自洽，不依赖使用方容器。',
    key: 'image-preview',
    routeItem: 'c-end:4',
    title: '图片预览',
    usageItems: [
      '商品图、内容配图需要点击放大查看时。',
      '需要大图懒加载、缩放与失败重试的统一体验时。'
    ]
  })
});

// ---- 页面构建 ----

function createCEndDocsDefinition(config) {
  return Object.freeze({
    apiIntro: config.apiIntro ?? '',
    apiRows: Object.freeze(config.apiRows ?? []),
    apiSignature: config.apiSignature ?? '',
    examples: Object.freeze(config.examples ?? []),
    examplesIntro: config.examplesIntro ?? '下面的示例可以直接复制到自己的对象组件中。',
    heading: config.heading,
    intro: config.intro,
    key: config.key,
    routeItem: config.routeItem,
    title: config.title,
    usageItems: Object.freeze(config.usageItems ?? []),
    usageTitle: config.usageTitle ?? '何时使用'
  });
}

export function SkeletonDocumentationPage() {
  return createCEndDocumentationPage(cEndDocsDefinitions.skeleton);
}

export function LazyImageDocumentationPage() {
  return createCEndDocumentationPage(cEndDocsDefinitions.lazyImage);
}

export function TransitionDocumentationPage() {
  return createCEndDocumentationPage(cEndDocsDefinitions.transition);
}

export function MasonryDocumentationPage() {
  return createCEndDocumentationPage(cEndDocsDefinitions.masonry);
}

export function ImagePreviewDocumentationPage() {
  return createCEndDocumentationPage(cEndDocsDefinitions.imagePreview);
}

function createCEndDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-c-end-docs components-c-end-docs--${definition.key}`
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-c-end-docs', definition.key);

        page.header((header) => {
          header.className('components-c-end-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-c-end-docs-usage');
          usage.h2(definition.usageTitle);
          usage.ul((list) => {
            definition.usageItems.forEach((itemText) => {
              list.li(itemText);
            });
          });
        });

        page.section((api) => {
          api.className('components-c-end-docs-api');
          api.h2('常用 API');
          if (definition.apiIntro) {
            api.p(definition.apiIntro);
          }
          api.pre((pre) => {
            pre.className('c-end-api-signature');
            pre.code(definition.apiSignature);
          });
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              definition.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-c-end-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(CEndExampleSection(demo));
          });
        });
      });
    }
  };
}

function CEndExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-c-end-demo');
        example.attr('data-c-end-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-c-end-demo-live');
          live.attr('data-c-end-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}
