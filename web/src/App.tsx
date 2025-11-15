import { useState } from 'react';
import IndexPage from '@/pages';

const PAGES = ['INDEX'] as const;
type Pages = (typeof PAGES)[number];

export default function App() {
  // TODO: 나중에 Custom hooks로 빼고, Context 연결해서 여러 컴포넌트에서 값을 받아볼 수 있도록...
  const [page, _] = useState<Pages>('INDEX');

  switch (page) {
    case 'INDEX':
      return <IndexPage />;
    default:
      // no-op
      return <></>;
  }
}
