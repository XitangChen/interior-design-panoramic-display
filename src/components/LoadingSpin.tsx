import { Space, Spin } from 'antd';
import style from './LoadingSpin.less';

export function LoadingSpin({ tip }: Partial<{ tip: string; }>) {
  return (
    <Space direction="vertical" className={style['loading-spin-container']}>
      <Spin tip={tip || 'Loading'} size="large"><div className="content" /></Spin>
    </Space>
  );
}
