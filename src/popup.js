import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { load } from 'cheerio';
import styled from 'styled-components';
import { inviteLink, isGoogle, isValidURL } from './utils';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const Container = styled.div`
  min-height: 300px;
  width: 600px;
`;

function Popup() {
  const [currentURL, setCurrentURL] = useState();
  const [googleSearchLinks, setGoogleSearchLinks] = useState([]);
  const [isJsonForm, setJsonForm] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [logs, setLogs] = useState([]);

  const bottomRef = useRef(null);

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
          setLinks([...new Set(linksFrom.map((val) => inviteLink(val)).filter((val) => val))]);
        } else {
          const validData = linksFrom.map((val) => (isValidURL(val) ? val : null));
          setGoogleSearchLinks([
            ...new Set(validData.filter((val) => val)),
          ]);
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
      const { data } = await axios.get(val, { timeout: 0 });
      const $ = load(data);
      const a = $('a');
      $(a).map((i, ele) => {
        const link = inviteLink($(ele).attr('href'));
        if (link) { waLinks.push(link); }
      });
      await sleep(2000);
    } catch (error) {
      tmpLogs.hasError = true;
      tmpLogs.errorMessage = new Error(error).message;
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

  const onCopyHandler = () => {
    const text = isJsonForm ? JSON.stringify(links) : links.join('\r\n');
    navigator.clipboard.writeText(text).then(() => {
      console.log('Async: Copying to clipboard was successful!');
    }, (err) => {
      console.error('Async: Could not copy text: ', err);
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isGoogle(currentURL) && links.length < 1) {
    return <h3>No links are found on this page.</h3>;
  }

  return (
    <Container>
      <div style={{ height: 330 }}>
        {links.length > 0 && (
        <>
          <div>
            <label>
              <input id="json-form" type="checkbox" onChange={() => setJsonForm(!isJsonForm)} checked={isJsonForm} />
              JSON form
            </label>
            <button type="button" onClick={onCopyHandler}>{`${links.length} copy`}</button>
          </div>
          <textarea
            value={isJsonForm ? JSON.stringify(links) : links.join('\r\n')}
            readOnly
            style={{
              width: '100%',
              height: '100%',
              resize: 'none',
              margin: '0',
              padding: '0',
              border: 'none',
            }}
          />
        </>
        )}
      </div>
      {isGoogle(currentURL) && (
        <>
          <button type="button" onClick={fetch} disabled={isLoading}>{isLoading ? 'Loading...' : 'Grab Links'}</button>
          <ul
            style={{
              margin: '0',
              padding: '0',
              listStyle: 'none',
              height: '50px',
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
        </>
      )}
    </Container>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById('root'),
);
