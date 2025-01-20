import PropTypes from "prop-types";
import React from "react";
import styled from "styled-components";
import Actions from "./Actions";

const Loader = styled.div`
  border-radius: 50%;
  height: 20px;
  position: relative;
  width: 20px;
`;

function Links({ links, isLoading, fetchAll, isGoogleSearch }) {
  if (isLoading) {
    return (
      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: "100vh",
          justifyContent: "center",
          width: "100vw",
        }}
      >
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
      />
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
                <a
                  className="font-mono text-small"
                  target="_blank"
                  href={link}
                  rel="noreferrer"
                >
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

Links.propTypes = {
  fetchAll: PropTypes.func.isRequired,
  isGoogleSearch: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  links: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default Links;
