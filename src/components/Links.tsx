import { useEffect, useState } from 'react';

import { styled } from 'styled-components';

import Actions from './Actions';
import { LinkValidation, getValidationStatus, getStatusColor, getStatusLabel } from '@src/validation';

const Loader = styled.div`
  border-radius: 50%;
  height: 20px;
  position: relative;
  width: 20px;
`;

const StatusBadge = styled.span<{ color: string }>`
  background-color: ${props => props.color};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`;

const TimestampText = styled.div`
  font-size: 11px;
  color: #666;
  margin-top: 2px;
`;

interface PropTypes {
  fetchAll: VoidFunction;
  isGoogleSearch: boolean;
  isLoading: boolean;
  links: string[];
  onValidateAll?: VoidFunction;
  isValidating?: boolean;
}

function Links({ links, isLoading, fetchAll, isGoogleSearch, onValidateAll, isValidating }: PropTypes) {
  const [validations, setValidations] = useState<Record<string, LinkValidation>>({});

  useEffect(() => {
    const loadValidations = async () => {
      const newValidations: Record<string, LinkValidation> = {};
      for (const link of links) {
        const validation = await getValidationStatus(link);
        if (validation) {
          newValidations[link] = validation;
        }
      }
      setValidations(newValidations);
    };
    loadValidations();
  }, [links]);

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
      <Actions 
        isGoogleSearchPage={isGoogleSearch} 
        isLoading={isLoading} 
        links={links} 
        onFetch={fetchAll}
        onValidateAll={onValidateAll}
        isValidating={isValidating}
      />
      <table className="ff-table bordered-rows full-width striped padding-tiny">
        <tbody>
          {links.map((link, index) => {
            const validation = validations[link];
            const hasValidation = !!validation;
            const status = validation?.status || 'pending';
            const color = getStatusColor(status);
            const label = getStatusLabel(status);
            const timestamp = validation?.lastValidated ? new Date(validation.lastValidated).toLocaleDateString() : '';

            return (
              <tr key={link}>
                <td>
                  {(index + 1).toLocaleString(undefined, {
                    useGrouping: false,
                    minimumIntegerDigits: 3,
                  })}
                </td>
                <td>
                  <div style={{ marginBottom: '4px' }}>
                    <a className="font-mono text-small" target="_blank" href={link} rel="noreferrer">
                      {link}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {hasValidation && (
                      <>
                        <StatusBadge color={color}>
                          {label}
                        </StatusBadge>
                        {timestamp && <TimestampText>Last checked: {timestamp}</TimestampText>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default Links;
