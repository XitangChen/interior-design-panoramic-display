/**
 * @file 参考来源：{@link http://www.yanhuangxueyuan.com/3D/houseDesign/index.html}
 */

import FlexCanvas from '@/components/FlexCanvas';
import { useCallback, useState } from 'react';
import { ThreeApp } from './ThreeApp';
import { renderMoreContent } from './renderMoreContent';
import { context } from './context';

export const title = '室内设计风格效果预览';

export default function App() {
  const [threeApp] = useState(new ThreeApp());
  const init = useCallback(threeApp.init.bind(threeApp), []);

  return (
    <context.Provider value={threeApp}>
      <FlexCanvas init={init} renderMoreContent={renderMoreContent} />
    </context.Provider>
  );
}
