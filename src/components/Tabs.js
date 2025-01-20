import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";

const selectedColor = "rgb(30,190,230)";
const defaultColor = "transparent";

const TabContainer = styled.div`
  align-items: stretch;
  display: flex;
  border-bottom: 1px solid ${selectedColor};
`;

const StyledTabItem = styled.div`
  background-color: white;
  border-bottom: 3px solid
    ${(props) => (props.selected ? selectedColor : defaultColor)};
  cursor: pointer;
  padding: 10px 16px;
  transition: 0.3s;
`;

function Tab({ currentSelected, tabs, onTabSelected }) {
  return (
    <TabContainer>
      {tabs.map((tab) => (
        <StyledTabItem
          selected={currentSelected === tab.key}
          onClick={() => onTabSelected(tab.key)}
          key={tab.key}
        >
          {tab.name}
        </StyledTabItem>
      ))}
    </TabContainer>
  );
}

Tab.propTypes = {
  onTabSelected: PropTypes.func.isRequired,
  currentSelected: PropTypes.string.isRequired,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      name: PropTypes.string,
    }),
  ).isRequired,
};

export default Tab;
