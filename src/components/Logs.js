import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";
import { convertToCsv } from "../utils";

const ActionBar = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
`;

const Loader = styled.div`
  border-radius: 50%;
  height: 20px;
  position: relative;
  width: 20px;
`;

function Logs({ logs, progress, isLoading }) {
  return (
    <>
      <ActionBar>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <p>{progress}</p>
          {isLoading && <Loader className="with-loader bg-grey" />}
        </div>
        <button
          type="button"
          disabled={isLoading}
          className="size-small shadow-hard bg-cyan"
          onClick={() =>
            convertToCsv(
              logs.map((log) => ({
                Total: log.count,
                Error: log.errorMessage,
                Link: log.href,
              })),
              "logs",
            )
          }
        >
          Download csv
        </button>
      </ActionBar>
      <table className="ff-table bordered-rows full-width striped padding-tiny">
        <tbody>
          {logs.map((log, index) => (
            <tr key={log.href} className="font-mono text-small">
              <td>
                {(logs.length - index).toLocaleString(undefined, {
                  useGrouping: false,
                  minimumIntegerDigits: 3,
                })}
              </td>
              <td>
                <a target="_blank" href={log?.href} rel="noreferrer">
                  {log?.origin}
                </a>
              </td>
              <td style={{ color: log?.hasError ? "red" : "inherit" }}>
                {log?.count > 0 && <p>{`finds ${log?.count} links`}</p>}
                {log?.errorMessage && <span>{log?.errorMessage}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

Logs.propTypes = {
  progress: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  logs: PropTypes.arrayOf(
    PropTypes.shape({
      origin: PropTypes.string,
      href: PropTypes.string,
      count: PropTypes.number,
      errorMessage: PropTypes.string,
      hasError: PropTypes.bool,
    }),
  ).isRequired,
};

export default Logs;
