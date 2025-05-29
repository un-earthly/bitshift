import React from 'react';

type Props = {
  tabs: { path: string; content: string }[];
  active: string;
  setActive: (path: string) => void;
};

const Tabs: React.FC<Props> = ({ tabs, active, setActive }) => {
  return (
    <div className="flex border-b bg-gray-100">
      {tabs.map(tab => (
        <div
          key={tab.path}
          className={`px-4 py-2 cursor-pointer ${active === tab.path ? 'bg-white border-t border-l border-r rounded-t' : ''}`}
          onClick={() => setActive(tab.path)}
        >
          {tab.path.split('/').pop()}
        </div>
      ))}
    </div>
  );
};

export default Tabs;
