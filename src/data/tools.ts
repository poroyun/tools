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
    description: 'HEX, RGB 등 다양한 색상 코드를 확인하세요.',
    href: '/colors/',
    icon: '◐',
    status: 'coming-soon',
  },
  {
    title: 'HTML 코드표',
    description: 'HTML 특수문자와 엔티티 코드를 찾아보세요.',
    href: '/entities/',
    icon: '</>',
    status: 'available',
  },
] satisfies Tool[];
