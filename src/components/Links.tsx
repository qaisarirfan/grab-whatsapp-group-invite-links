import { styled } from 'styled-components';

import Actions from './Actions';

const Loader = styled.div`
  border-radius: 50%;
  height: 20px;
  position: relative;
  width: 20px;
`;

interface PropTypes {
  fetchAll: VoidFunction;
  isGoogleSearch: boolean;
  isLoading: boolean;
  links: string[];
}

function Links({ links, isLoading, fetchAll, isGoogleSearch }: PropTypes) {
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
      <Actions isGoogleSearchPage={isGoogleSearch} isLoading={isLoading} links={links} onFetch={fetchAll} />
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
              <td>
                <a className="font-mono text-small" target="_blank" href={link} rel="noreferrer">
                  {link}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default Links;
