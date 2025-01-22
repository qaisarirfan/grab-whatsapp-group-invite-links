import { styled } from 'styled-components';

const selectedColor = 'rgb(30,190,230)';
const defaultColor = 'transparent';

const TabContainer = styled.div`
  align-items: stretch;
  display: flex;
  border-bottom: 1px solid ${selectedColor};
`;

const StyledTabItem = styled.div<{ $selected: boolean }>`
  background-color: white;
  border-bottom: 3px solid ${({ $selected }) => ($selected ? selectedColor : defaultColor)};
  cursor: pointer;
  padding: 10px 16px;
  transition: 0.3s;
`;

interface Props {
  onTabSelected: (val: string) => void;
  currentSelected: string;
  tabs: {
    key: string;
    name: string;
  }[];
}

function Tab({ currentSelected, tabs, onTabSelected }: Props) {
  return (
    <TabContainer>
      {tabs.map(tab => (
        <StyledTabItem $selected={currentSelected === tab.key} onClick={() => onTabSelected(tab.key)} key={tab.key}>
          {tab.name}
        </StyledTabItem>
      ))}
    </TabContainer>
  );
}

export default Tab;
