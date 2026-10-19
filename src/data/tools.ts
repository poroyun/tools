import type { Props as Tool } from '../components/ToolCard.astro';

export const tools = [
  {
    title: '특수문자 모음',
    description: '이모지와 이모티콘을 검색하고 간편하게 복사하세요.',
    href: '/characters/',
    icon: '☺',
    status: 'available',
  },
  {
    title: '색상표',
    description: 'HEX·RGB·HSL 색상 코드를 선택하고 변환·복사하세요.',
    href: '/colors/',
    icon: '◐',
    status: 'available',
  },
  {
    title: 'HTML 코드표',
    description: 'HTML 특수문자와 엔티티 코드를 찾아보세요.',
    href: '/entities/',
    icon: '</>',
    status: 'available',
  },
] satisfies Tool[];
