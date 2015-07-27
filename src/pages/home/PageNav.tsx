import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import style from './style.less';

export function PageNav({
  total,
  pageIndex,
  pageSize,
  onClick
}: {
  total: number;
  pageIndex: number;
  pageSize: number;
  onClick: (n: number) => void;
}) {
  return (
    <p className={style['page-nav']}>
      <span className={style.total}>
        {
          total ? `${pageIndex || 0}/${pageSize ? Math.ceil(total / pageSize) : 0}` : 0
        }
      </span>
      <button type="button" className={style.prev} onClick={() => onClick(-1)}>
        <LeftOutlined />
        <span className={style.text}>上一张</span>
      </button>
      <button type="button" className={style.next} onClick={() => onClick(1)}>
        <RightOutlined />
        <span className={style.text}>下一张</span>
      </button>
    </p>
  );
}
