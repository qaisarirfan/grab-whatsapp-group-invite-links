import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  onTabSelected: (val: string) => void;
  currentSelected: string;
  tabs: {
    key: string;
    name: string;
    disabled?: boolean;
  }[];
}

function Tab({ currentSelected, tabs, onTabSelected }: Props) {
  return (
    <Tabs value={currentSelected} onValueChange={(value) => onTabSelected(value as string)}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} disabled={tab.disabled} title={tab.disabled ? 'Not available yet' : undefined}>
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export default Tab;
