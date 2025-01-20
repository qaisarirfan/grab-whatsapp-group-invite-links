import React, { useState } from "react";
import styled from "styled-components";
import PropTypes from "prop-types";
import { convertToCsv, copyToClipboard } from "../utils";

const ActionsContainer = styled.div`
  align-items: center;
  background: #fff;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-between;
  left: 12px;
  padding-bottom: 12px;
  padding-top: 12px;
  position: sticky;
  right: 12px;
  top: 0;
`;

function Actions({ isGoogleSearchPage, isLoading, links, onFetch }) {
  const [hasCopyAsJSON, setHasCopyAsJSON] = useState(false);
  const [isCopyAsJSON, setIsCopyAsJSON] = useState(false);
  const [hasCopyAsText, setHasCopyAsText] = useState(false);
  const [isCopyAsText, setIsCopyAsText] = useState(false);

  const onFetchHandler = () => {
    setHasCopyAsJSON(false);
    setHasCopyAsText(false);
    onFetch();
  };

  const handleCopy = async (format) => {
    const isTextFormat = format === "text";

    setHasCopyAsJSON(false);
    setHasCopyAsText(false);

    if (isTextFormat) {
      setIsCopyAsText(true);
    } else {
      setIsCopyAsJSON(true);
    }

    try {
      const content = isTextFormat ? links.join("\r\n") : JSON.stringify(links);
      await copyToClipboard(content);

      if (isTextFormat) {
        setIsCopyAsText(false);
        setHasCopyAsText(true);
      } else {
        setIsCopyAsJSON(false);
        setHasCopyAsJSON(true);
      }
    } catch (error) {
      if (isTextFormat) {
        setIsCopyAsText(false);
        setHasCopyAsText(false);
      } else {
        setIsCopyAsJSON(false);
        setHasCopyAsJSON(false);
      }
    }
  };

  const buttonClasses = [
    "size-small",
    "shadow-hard",
    "bg-blue",
    "text-white",
    "with-loader",
  ];
  let copyAsTextButton = [...buttonClasses];
  if (!isCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter((val) => val !== "with-loader");
  }
  if (hasCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter((val) => val !== "bg-blue");
    copyAsTextButton.push("bg-green");
  }

  let copyAsJSONButton = [...buttonClasses];
  if (!isCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter((val) => val !== "with-loader");
  }
  if (hasCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter((val) => val !== "bg-blue");
    copyAsJSONButton.push("bg-green");
  }
  return (
    <ActionsContainer>
      <div>{links.length > 0 && <p>{`Total: ${links.length}`}</p>}</div>
      <div>
        {isGoogleSearchPage && links.length > 0 && (
          <button
            className={`size-small bg-yellow shadow-hard ${isLoading && "with-loader"}`}
            type="button"
            onClick={onFetchHandler}
            disabled={isLoading}
          >
            Extract again
          </button>
        )}
        <button
          className={copyAsTextButton.join(" ")}
          type="button"
          onClick={() => handleCopy("text")}
        >
          {`${hasCopyAsText ? "Copied" : "Copy"} as Text`}
        </button>
        <button
          className={copyAsJSONButton.join(" ")}
          type="button"
          onClick={() => handleCopy("json")}
        >
          {`${hasCopyAsJSON ? "Copied" : "Copy"} as JSON`}
        </button>
        <button
          type="button"
          className="size-small shadow-hard bg-cyan"
          onClick={() =>
            convertToCsv(
              links.map((link) => ({ Links: link })),
              "links",
            )
          }
        >
          Download csv
        </button>
      </div>
    </ActionsContainer>
  );
}

Actions.propTypes = {
  isGoogleSearchPage: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  links: PropTypes.arrayOf(PropTypes.string).isRequired,
  onFetch: PropTypes.func.isRequired,
};

export default Actions;
