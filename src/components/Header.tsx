import { styled } from 'styled-components';

const StyledHeader = styled.header`
  align-items: center;
  border-left: unset;
  border-right: unset;
  border-top: unset;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 8px;

  .logo {
    display: flex;
    align-items: center;
    flex-direction: column;

    img {
      height: auto;
      width: 70px;
    }

    p {
      font-size: 18px;
    }
  }
  .buymeacoffee {
    align-items: center;
    display: flex;
    gap: 12px;
    padding: 18px 0;

    img {
      height: 30px;
    }
  }
`;

function Header() {
  return (
    <StyledHeader>
      <div className="logo">
        <img src="./images/logo.png" alt="logo" />
        <p>Grab whatsapp group invite links</p>
      </div>
      <div className="buymeacoffee">
        <p>Support me on</p>
        <a href="https://www.buymeacoffee.com/qaisarirfan" target="_blank" rel="noreferrer">
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" />
        </a>
      </div>
    </StyledHeader>
  );
}

export default Header;
