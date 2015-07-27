import {
  useReducer,
  Fragment,
  useContext,
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  useCallback,
  Suspense
} from 'react';
import { debounceTime } from 'rxjs';
import { StyleInfo, StyleList, getDecorationStyleInfo } from '@/apis/getDecorationStyleInfo';
import { wrapPromise } from '@/utils/wrapPromise';
import { LoadingSpin } from '@/components/LoadingSpin';
import { Tools } from './Tools';
import style from './style.less';
import { context } from './context';
import { PageNav } from './PageNav';

const result = wrapPromise(getDecorationStyleInfo());

function reducer(
  state: StyleList,
  {
    type,
    payload
  }: {
    type: string;
    payload: {
      name: string;
      parentName?: string;
    };
  }
) {
  const actionInfo = {
    selectStyle() {
      const { name } = payload;
      return state.map((item) => {
        const selected = item.name === name;
        return {
          ...item,
          selected,
          parts: item.parts.map((part, index) => ({
            ...part,
            selected: Boolean(selected && !index)
          }))
        };
      }) as StyleList;
    },
    selectPosition() {
      const { name, parentName } = payload;
      return state.map(item => {
        const { parts } = item;
        const selected = item.name === parentName;
        const selectedPartName = selected && (parts?.find(part => part.name === name) || parts[0])?.name;
        return {
          ...item,
          selected,
          parts: parts.map((part) => ({
            ...part,
            selected: Boolean(selectedPartName && selectedPartName === part.name)
          }))
        };
      }) as StyleList;
    }
  };
  return actionInfo?.[type as keyof typeof actionInfo]?.() || state;
}

function renderDlContent(
  styles: StyleList,
  dispatch: Dispatch<Parameters<typeof reducer>[1]>,
  positionList: StyleInfo,
  setPageIndex: Dispatch<SetStateAction<number>>
) {
  return (
    [
      [
        '风格',
        styles,
        (name: string) => {
          dispatch({ type: 'selectStyle', payload: { name } });
          setPageIndex(1);
        }
      ],
      [
        '位置',
        positionList,
        (name: string, parentName: string) => {
          dispatch({ type: 'selectPosition', payload: { name, parentName } });
        }
      ]
    ] as [string, StyleList | StyleInfo, (name: string, parentName: string) => void][]
  ).map(([label, data, clickHandler]) => (
    <Fragment key={label}>
      <dt>{`${label}：`}</dt>
      <dd>
        {(Array.isArray(data) ? data : data?.parts)?.map(({ name, selected }) => (
          <span
            role="button"
            tabIndex={0}
            key={name}
            className={selected ? 'selected' : ''}
            onClick={() => clickHandler(name, (data as StyleInfo)?.name)}
            onKeyDown={() => clickHandler(name, (data as StyleInfo)?.name)}
          >
            {name}
          </span>
        ))}
      </dd>
    </Fragment>
  ));
}

function Content({ styleList }: { styleList: StyleList; }) {
  const [styles, dispatch] = useReducer(reducer, styleList);
  const threeApp = useContext(context);
  const [loading, setLoading] = useState(threeApp.loading);
  const positionList = styles.find(({ selected }) => selected);
  const part = positionList?.parts.find(({ selected }) => selected);
  const total = part?.images.length || 0;
  const [pageIndex, setPageIndex] = useState(1);
  const onClick = useCallback((n: number) => setPageIndex((index) => {
    const nextIndex = index + n;
    return Math.min(total, Math.max(1, nextIndex));
  }), [total]);

  threeApp.updateTexture(
    styles?.find(({ selected }) => selected)?.parts?.find(({ selected }) => selected)?.images[pageIndex - 1] || ''
  );
  useEffect(() => {
    const sub = threeApp.loading$.pipe(debounceTime(100)).subscribe(value => setLoading(value));
    return () => { sub.unsubscribe(); };
  }, []);

  return (
    <>
      <Tools />
      <dl className={style['menu-nav']}>
        {renderDlContent(styles, dispatch, positionList as StyleInfo, setPageIndex)}
      </dl>
      <PageNav pageIndex={pageIndex} pageSize={1} total={part?.images.length || 0} onClick={onClick} />
      {loading ? <LoadingSpin /> : null}
    </>
  );
}

function AsyncContent() {
  const styleList = result.read();
  return <Content styleList={styleList} />;
}

export function renderMoreContent() {
  return (
    <Suspense fallback={<LoadingSpin />}>
      <AsyncContent />
    </Suspense>
  );
}
