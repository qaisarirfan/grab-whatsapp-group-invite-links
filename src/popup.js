import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { load } from 'cheerio';
import styled from 'styled-components';
import {
  copyToClipboard, inviteLink, isGoogle,
} from './utils';

const Container = styled.div`
  max-width: 600px;
  min-height: 300px;
  padding: 12px;
  padding-top: 0px;
  position: relative;
  width: 500px;
`;

const StatusBarContainer = styled.div`
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

function Popup() {
  const [currentURL, setCurrentURL] = useState();
  const [googleSearchLinks, setGoogleSearchLinks] = useState([]);
  const [hasCopyAsJSON, setHasCopyAsJSON] = useState(false);
  const [isCopyAsJSON, setIsCopyAsJSON] = useState(false);
  const [hasCopyAsText, setHasCopyAsText] = useState(false);
  const [isCopyAsText, setIsCopyAsText] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [otherLinks, setOtherLinks] = useState([]);
  const [toggleLogs, setToggleLogs] = useState(false);

  const bottomRef = useRef(null);

  const isGoogleSearchPage = isGoogle(currentURL);

  const getAllAnchorTags = () => {
    const isGoogleSearch = `${window?.location?.origin}${window?.location?.pathname}` === 'https://www.google.com/search';
    let tags = document.getElementsByTagName('a');
    if (isGoogleSearch) {
      tags = document.querySelectorAll('#search a');
    }
    const ls = [];
    for (let idx = 0; idx < tags.length; idx += 1) {
      const value = tags[idx];
      const res = value.href.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g);
      if (res !== null) {
        ls.push(value.href);
      }
    }
    return Array.from(new Set(ls));
  };

  useEffect(() => {
    chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
      const { url, id } = tabs[0];
      setCurrentURL(url);
      chrome.scripting.executeScript({
        target: { tabId: id },
        func: getAllAnchorTags,
      }, (injectionResults) => {
        let linksFrom = [];
        injectionResults?.forEach(({ result }) => {
          linksFrom = [...linksFrom, ...result];
        });
        if (!isGoogle(url)) {
          const whatsappLink = linksFrom.map((val) => inviteLink(val)).filter((val) => val);
          if (whatsappLink.length > 0) {
            setLinks([...new Set(whatsappLink)]);
          } else {
            setOtherLinks([...new Set(linksFrom)]);
          }
        } else {
          setGoogleSearchLinks([...new Set(linksFrom)]);
        }
      });
    });
  }, []);

  const getWhatsappLink = async (val) => {
    const waLinks = [];
    const tmpLogs = {
      count: 0,
      errorMessage: null,
      hasError: false,
      link: new URL(val).origin,
    };
    try {
      const { data } = await axios.get(val, { timeout: 10000 });
      const $ = load(data);
      const a = $('a');
      $(a).map((i, ele) => {
        const link = inviteLink($(ele).attr('href'));
        if (link) { waLinks.push(link); }
      });
    } catch (error) {
      tmpLogs.hasError = true;
      tmpLogs.errorMessage = new Error(error).message.replace('AxiosError: ', '');
    }
    setLogs((prevState) => ([
      ...prevState,
      ...[{
        ...tmpLogs,
        count: waLinks.length,
      }],
    ]));
    return waLinks;
  };

  const fetch = async () => {
    setLoading(true);
    setLinks([]);
    setLogs([]);
    let store = [];
    const promise = googleSearchLinks.map((link) => getWhatsappLink(link));
    try {
      const res = await Promise.all(promise);
      res.forEach((r) => {
        store = [...store, ...r];
      });
      setLinks([...new Set(store)]);
    } catch {
      throw Error('Promise failed');
    }
    setLoading(false);
  };

  const onCopyAsTextHandler = async () => {
    setHasCopyAsJSON(false);
    setIsCopyAsText(true);
    setHasCopyAsText(false);
    try {
      const text = links.join('\r\n');
      await copyToClipboard(text);
      setIsCopyAsText(false);
      setHasCopyAsText(true);
    } catch (error) {
      setIsCopyAsText(false);
      setHasCopyAsText(false);
    }
  };

  const onCopyAsJSONHandler = async () => {
    setHasCopyAsText(false);
    setIsCopyAsJSON(true);
    setHasCopyAsJSON(false);
    try {
      const text = JSON.stringify(links);
      await copyToClipboard(text);
      setIsCopyAsJSON(false);
      setHasCopyAsJSON(true);
    } catch (error) {
      setIsCopyAsJSON(false);
      setHasCopyAsJSON(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const buttonClasses = ['size-small', 'shadow-hard', 'bg-blue', 'text-white', 'with-loader'];
  let copyAsTextButton = [...buttonClasses];
  if (!isCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter((val) => val !== 'with-loader');
  }
  if (hasCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter((val) => val !== 'bg-blue');
    copyAsTextButton.push('bg-green');
  }

  let copyAsJSONButton = [...buttonClasses];
  if (!isCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter((val) => val !== 'with-loader');
  }
  if (hasCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter((val) => val !== 'bg-blue');
    copyAsJSONButton.push('bg-green');
  }

  return (
    <Container>
      <StatusBarContainer>
        <div>{links.length > 0 && <p>{`Total: ${links.length}`}</p>}</div>
        <div>
          <a
            data-modal="modal-01"
            className="js-open-modal"
            onClick={() => setToggleLogs(true)}
          >
            Logs
          </a>
          <button
            className={copyAsTextButton.join(' ')}
            type="button"
            onClick={onCopyAsTextHandler}
            disabled={links.length < 1}
          >
            {`${hasCopyAsText ? 'Copied' : 'Copy'} as Text`}
          </button>
          <button
            className={copyAsJSONButton.join(' ')}
            type="button"
            onClick={onCopyAsJSONHandler}
            disabled={links.length < 1}
          >
            {`${hasCopyAsJSON ? 'Copied' : 'Copy'} as JSON`}
          </button>
        </div>
      </StatusBarContainer>
      {links.length > 0 && (
        <table className="ff-table bordered-rows full-width striped padding-tiny">
          <tbody>
            {links.map((link) => (
              <tr key={link}>
                <td><a target="_blank" href={link} rel="noreferrer">{link}</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {(!isGoogleSearchPage && links.length < 1) && (
        <p className="text-centre">{`There is no WhatsApp group link on this page but you found ${otherLinks.length} other links.`}</p>
      )}
      {isGoogleSearchPage && (
        <>
          <p className="text-centre">Extract WhatsApp group links from Google search</p>
          <div className="text-center">
            <button
              className={`bg-yellow shadow-hard ${isLoading && 'with-loader'}`}
              type="button"
              onClick={fetch}
              disabled={isLoading}
            >
              Extract
            </button>
          </div>
          {links.length < 1 && (
            <ul
              style={{
                height: '100px',
                overflow: 'auto',
              }}
            >
              {logs.map((log, index) => (
                <li key={`${log?.link}-${index}`} style={{ color: log?.hasError ? 'red' : 'inherit' }}>
                  <p>{`${log?.link} - finds ${log?.count} links`}</p>
                  <span>{log?.errorMessage}</span>
                </li>
              ))}
              <li ref={bottomRef} />
            </ul>
          )}
        </>
      )}
      <div id="modal-01" className={`ff-modal-wrapper ${toggleLogs && 'active'}`}>
        <div className="ff-modal-overlay">
          <div className="ff-modal-content">
            <div className="ff-card padding-medium shape-rounded bg-white shadow-soft">
              <a
                className="close-modal js-close-modal"
                onClick={() => setToggleLogs(false)}
              >
                <span className="text-large">×</span>
              </a>
              <table className="ff-table bordered-rows full-width padding-tiny">
                <tbody>
                  {logs.map((log) => (
                    <tr className={`${log?.hasError && 'text-brown'}`} key={log?.link}>
                      <td>
                        <p>{`${log?.link} - finds ${log?.count} links`}</p>
                        <span>{log?.errorMessage}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById('root'),
);
