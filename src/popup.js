import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { load } from 'cheerio';
import { inviteLink, isValidURL } from './utils';

function Popup() {
  const [isLoading, setLoading] = useState(false);
  const [links, setLinks] = useState([]);
  const [currentURL, setCurrentURL] = useState();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
      setCurrentURL(tabs[0].url);
    });
  }, []);

  const getWhatsappLink = async (val) => {
    const waLinks = [];
    try {
      const { data } = await axios.get(val);
      const $ = load(data);
      const a = $('a');
      $(a).map((i, ele) => {
        const link = inviteLink($(ele).attr('href'));
        if (link) { waLinks.push(link); }
      });
      setLogs([...logs, ...[{ link: new URL(val).origin, count: waLinks.length, hasError: false }]]);
    } catch (error) {
      setLogs([...logs, ...[{ link: new URL(val).origin, count: waLinks.length, hasError: true }]]);
    }
    return waLinks;
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(currentURL || '');
      const $ = load(data);
      const a = $('#search a');
      let store = [];
      const promise = [];
      $(a).map(async (i, ele) => {
        const link = $(ele).attr('href');
        if (isValidURL(link)) {
          promise.push(getWhatsappLink(link));
          // const d = await getWhatsappLink(link);
          // promise.push({
          //   link,
          //   count: d.length,
          // });
          // setLogs(promise);
          // store = [...store, ...d];
          // setLinks([...new Set(store)]);
        }
      });
      try {
        const res = await Promise.all(promise);
        res.forEach((r) => {
          store = [...store, ...r];
        });
        setLinks(store);
        // setLinks([...new Set(store)]);
      } catch {
        throw Error('Promise failed');
      }
      setLoading(false);
    } catch (error) { }
  };

  return (
    <>
      <ul style={{ minWidth: '700px' }}>
        <li>
          {links.length}
        </li>
      </ul>
      <textarea value={links.join('\r\n')} readOnly style={{ width: '100%', height: 100 }} />
      <textarea value={JSON.stringify(links)} readOnly style={{ width: '100%', height: 100 }} />
      <button type="button" onClick={fetch} disabled={isLoading}>{isLoading ? 'Loading...' : 'Grab Links'}</button>
      {logs.map((log) => (
        <li style={{ color: log?.hasError ? 'red' : 'inherit' }}>
          {log?.link}
          {' '}
          -
          {' '}
          {log?.count}
        </li>
      ))}
    </>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById('root'),
);
