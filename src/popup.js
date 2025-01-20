import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import styled from "styled-components";
import pLimit from "p-limit";

import {
  extractWhatsappLinks,
  fetchData,
  handleError,
  inviteLink,
  isGoogle,
  parseUrl,
} from "./utils";
import Links from "./components/Links";
import Header from "./components/Header";
import Logs from "./components/Logs";
import { GOOGLE_SEARCH_URL } from "./constants";
import Tab from "./components/Tabs";

const Container = styled.div`
  max-width: 650px;
  min-height: calc(100vh - 60px);
  min-width: 650px;
  padding: 12px;
  position: relative;
`;

const ExtractButton = styled.button`
  margin-top: 12px;
  &::after {
    border-color: #000;
    border-top-color: transparent;
    border-right-color: transparent;
  }
`;

function Popup() {
  const ref = useRef();
  const [currentURL, setCurrentURL] = useState();
  const [googleSearchLinks, setGoogleSearchLinks] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [otherLinks, setOtherLinks] = useState([]);
  const [currentTab, setCurrentTab] = useState("links");

  const isGoogleSearchPage = isGoogle(currentURL);

  const searchLinks = useMemo(
    () => googleSearchLinks.filter((val) => !val.includes(GOOGLE_SEARCH_URL)),
    [googleSearchLinks],
  );

  const getAllAnchorTags = () => {
    const isGoogleSearch =
      `${window?.location?.origin}${window?.location?.pathname}` ===
      "https://www.google.com/search";

    let tags = document.getElementsByTagName("a");
    if (isGoogleSearch) {
      tags = document.querySelectorAll("#search a");
    }
    const ls = [];
    for (let idx = 0; idx < tags.length; idx += 1) {
      const value = tags[idx];
      const res = value.href.match(
        /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g,
      );
      if (res !== null) {
        ls.push(value.href);
      }
    }
    return Array.from(new Set(ls));
  };

  useEffect(() => {
    chrome.tabs.query(
      { active: true, windowId: chrome.windows.WINDOW_ID_CURRENT },
      (tabs) => {
        const { url, id } = tabs[0];
        setCurrentURL(url);
        chrome.scripting.executeScript(
          {
            target: { tabId: id },
            func: getAllAnchorTags,
          },
          (injectionResults) => {
            let linksFrom = [];
            injectionResults?.forEach(({ result }) => {
              linksFrom = [...linksFrom, ...result];
            });
            if (!isGoogle(url)) {
              const whatsappLink = linksFrom
                .map((val) => inviteLink(val))
                .filter((val) => val);
              if (whatsappLink.length > 0) {
                setLinks([...new Set(whatsappLink)]);
              } else {
                setOtherLinks([...new Set(linksFrom)]);
              }
            } else {
              setGoogleSearchLinks([...new Set(linksFrom)]);
            }
          },
        );
      },
    );
  }, []);

  const logResults = (log, waLinks) => {
    setLogs((prevState) => [
      ...prevState,
      {
        ...log,
        count: waLinks.length,
      },
    ]);
  };

  const getWhatsappLink = async (val) => {
    const waLinks = [];
    const tmpLog = {
      count: 0,
      errorMessage: null,
      hasError: false,
      ...parseUrl(val),
    };

    try {
      const { data } = await fetchData(val);
      const extractedLinks = extractWhatsappLinks(data);
      waLinks.push(...extractedLinks);
    } catch (error) {
      Object.assign(tmpLog, handleError(error.message));
    }
    logResults(tmpLog, waLinks);
    return waLinks;
  };

  const fetchAll = async () => {
    ref.current = true;
    setCurrentTab("logs");
    const limit = pLimit(50); // Allow up to 50 concurrent requests
    setLinks([]);
    setLoading(true);
    setLogs([]);
    let store = [];

    const promises = searchLinks.map((link) =>
      limit(() => getWhatsappLink(link)),
    );

    try {
      const res = await Promise.allSettled(promises);

      res.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          store = [...store, ...r.value];
        }
      });
      const uniqueLinks = [...new Set(store)];
      setLinks(uniqueLinks);
    } finally {
      setLoading(false);
      setCurrentTab("links");
    }
  };

  const nonGoogleMessage = [
    "There is no WhatsApp group link on this page",
    otherLinks.length > 0
      ? ` but you found ${otherLinks.length} other links. `
      : '. ',
  ]
    .join("")
    .trim();

  return (
    <Container
      style={{
        ...(!ref.current &&
          (links.length === 0 || logs.length === 0) && {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }),
      }}
    >
      {isGoogleSearchPage && ref.current && (
        <>
          <Tab
            tabs={[
              { name: "Logs", key: "logs" },
              { name: "Links", key: "links" },
            ]}
            currentSelected={currentTab}
            onTabSelected={(tab) => setCurrentTab(tab)}
          />
          {currentTab === "links" && (
            <Links
              links={links}
              fetchAll={fetchAll}
              isLoading={isLoading}
              isGoogleSearch={isGoogleSearchPage}
            />
          )}
          {currentTab === "logs" && (
            <Logs
              logs={logs.reverse()}
              isLoading={isLoading}
              progress={`${logs.length}/${searchLinks.length}`}
            />
          )}
        </>
      )}
      {!isGoogleSearchPage && links.length > 0 && (
        <Links
          links={links}
          fetchAll={fetchAll}
          isLoading={isLoading}
          isGoogleSearch={isGoogleSearchPage}
        />
      )}
      {!isGoogleSearchPage && links.length < 1 && (
        <>
          <Header />
          <p className="text-centre">{nonGoogleMessage}</p>
        </>
      )}
      {isGoogleSearchPage && links.length < 1 && logs.length < 1 && (
        <>
          <Header />
          <p className="text-centre">
            Extract WhatsApp group links from Google search result (
            {searchLinks.length})
          </p>
          <div className="text-center">
            <ExtractButton
              className={`shape-rounded bg-yellow shadow-hard ${isLoading && "with-loader"}`}
              type="button"
              onClick={fetchAll}
              disabled={isLoading}
            >
              Extract {logs.length > 0 && links.length === 0 ? "again" : null}
            </ExtractButton>
          </div>
        </>
      )}
    </Container>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
