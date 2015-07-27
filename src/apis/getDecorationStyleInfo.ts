import axios from 'axios';

export interface PartInfo {
  name: string;
  selected?: boolean;
  images: string[];
}

export interface StyleInfo extends Omit<PartInfo, 'images'> {
  parts: PartInfo[];
}

export type StyleList = StyleInfo[];

export async function getDecorationStyleInfo() {
  const response = await axios.get<StyleList>('data/decoration-style-info.json');
  return response.data;
}
