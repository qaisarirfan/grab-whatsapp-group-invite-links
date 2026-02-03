import { styled } from 'styled-components';

const Loader = styled.div`
  border-radius: 50%;
  height: 20px;
  position: relative;
  width: 20px;
`;

interface PropTypes {
  isLoading: boolean;
  links: string[];
  onValidate: VoidFunction;
}

function ValidLinks({ links, isLoading, onValidate }: PropTypes) {
  if (isLoading) {
    return (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          width: '100vw',
        }}>
        <Loader className="with-loader bg-grey" />
      </div>
    );
  }

  return (
    <>
      <button onClick={onValidate}>Re-validate</button>
      <table className="ff-table bordered-rows full-width striped padding-tiny">
        <tbody>
          {links.map((link, index) => (
            <tr key={link}>
              <td>
                {(index + 1).toLocaleString(undefined, {
                  useGrouping: false,
                  minimumIntegerDigits: 3,
                })}
              </td>
              {/* <td>
                <div className="text-small">
                  {isValid === true && '✅'}
                  {isValid === false && '❌'}
                </div>
                <a className="font-mono text-small" target="_blank" href={link} rel="noreferrer">
                  {link}
                  <div className="text-grey text-tiny">{name}</div>
                </a>
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default ValidLinks;
