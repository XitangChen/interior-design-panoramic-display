import { Dispatch, useCallback, useContext, useEffect, useReducer } from 'react';
import { App } from 'antd';
import style from './style.less';
import { context } from './context';
import { ThreeApp } from './ThreeApp';

interface ButtonInfo {
  name: string;
  icons: [[string, string], [string, string]];
  icon: [string, string];
  click?: (button: ButtonInfo, threeApp: ThreeApp) => boolean | void;
  type?: string;
  hidden?: boolean;
  modalRef?: {
    destroy: () => void;
  }
}

function clickHandler(button: ButtonInfo, threeApp: ThreeApp) {
  const { icons, type } = button;

  button.icon = icons[button.icon[0] === icons[0][0] ? 1 : 0];
  type && threeApp.onClick(type, button.icon[0] !== button.icons[0][0]);

  return true;
}

const buttonList = [
  {
    name: '声音',
    icons: [['打开声音.png', '关闭声音'], ['关闭声音.png', '打开声音']],
    click: clickHandler,
    type: 'toggleAudio'
  },
  {
    name: '全屏',
    icons: [['全屏5.png', '全屏'], ['退出全屏.png', '退出全屏']],
    click: clickHandler,
    type: 'toggleFullscreen'
  },
  {
    label: '旋转',
    icons: [['旋转.png', '停止旋转'], ['停止旋转.png', '旋转']],
    click: clickHandler,
    type: 'toggleRotation'
  },
  {
    name: '帮助',
    icons: [['帮助5.png', '操作提示']]
  }
].map((item) => {
  const { icons } = item;
  return {
    ...item,
    icons: icons.length < 2 ? [...icons, ...icons] : icons,
    icon: item.icons[0]
  };
}) as ButtonInfo[];

function addFullscreenchangeEvent(callback: (fullscreenElementExisting: boolean) => void) {
  const eventName = 'fullscreenchange';
  const listener = () => callback(!!document.fullscreenElement);
  const useCapture = false;
  document.addEventListener(eventName, listener, useCapture);
  return () => document.removeEventListener(eventName, listener, useCapture);
}

function showHelpInfoModal(button: ButtonInfo, modal: ReturnType<typeof App.useApp>['modal']) {
  const destroy = () => {
    if (button.modalRef) {
      button.modalRef.destroy();
      button.modalRef = undefined;
      return true;
    }
    return false;
  };
  if (!destroy()) {
    button.modalRef = modal.info({
      title: '操作提示',
      className: style['help-info-modal'],
      content: (
        <dl>
          <dt>旋转操作：</dt>
          <dd>按住左键不放上下左右拖动，可以旋转整个场景</dd>
        </dl>
      ),
      onOk: destroy
    });
  }
}

function reducer(
  state: ButtonInfo[],
  {
    type,
    fullscreenElementExisting
  }: {
    type: 'update' | 'fullscreenchange';
    fullscreenElementExisting?: boolean;
  }
) {
  const update = () => state.map(item => ({ ...item }));

  return ({
    update,
    fullscreenchange() {
      type Handler = (button: ButtonInfo) => void;
      const handlerConfig = {
        ...!fullscreenElementExisting && {
          全屏: (button: ButtonInfo) => {
            button.icon = button.icons[0];
          }
        },
        帮助: (button: ButtonInfo) => {
          button.hidden = fullscreenElementExisting;
        }
      } as { [K: string]: true | Handler };
      const names = Object.keys(handlerConfig);
      state.some(button => {
        if (!names.length) {
          return true;
        }
        const { name } = button;
        const handler = handlerConfig[name] as Handler;
        if (handler) {
          handler(button);
          names.some((n, index) => (n === name ? (names.splice(index, 1), true) : false));
        }
        return false;
      });

      return update();
    }
  } as { [K: string]: () => ButtonInfo[]; })[type]?.() || state;
}

function checkSoundIcon(buttons: ButtonInfo[], mute: boolean, dispatch: Dispatch<Parameters<typeof reducer>[1]>) {
  const button = buttons.find(item => item.name === '声音');

  if (button) {
    const icon = button.icons[mute ? 1 : 0];

    if (button.icon !== icon) {
      button.icon = icon;
      dispatch({ type: 'update' });
    }
  }
}

function Tools() {
  const threeApp = useContext(context);
  const { modal } = App.useApp();
  const [buttons, dispatch] = useReducer(reducer, buttonList);
  const click = useCallback((button: ButtonInfo) => {
    if (button.name === '帮助') {
      showHelpInfoModal(button, modal);
    } else if (button.click?.(button, threeApp)) {
      dispatch({ type: 'update' });
    }
  }, []);

  checkSoundIcon(buttons, threeApp.mute, dispatch);
  useEffect(() => {
    const remove = addFullscreenchangeEvent((fullscreenElementExisting: boolean) => {
      dispatch({ type: 'fullscreenchange', fullscreenElementExisting });
    });
    return () => {
      buttons.forEach((button) => {
        button.modalRef && button.modalRef.destroy();
        button.modalRef = undefined;
      });
      remove();
    };
  }, []);

  return (
    <div className={style.tools}>
      {
        buttons.map((item, index) => (item.hidden ? null : (
          <button type="button" key={[item.name, index].join('_')} onClick={() => click(item)}>
            <img src={`/images/icons/${item.icon[0]}`} alt={item.name} title={item.icon[1]} width="22" height="22" />
          </button>
        )))
      }
    </div>
  );
}

function AppTools() {
  return (
    <App>
      <Tools />
    </App>
  );
}

export { AppTools as Tools };
