import { h, render } from 'preact';
import { apis } from './apis';
import { Blacklist } from './blacklist';
import { BlockPopup } from './block-dialog';
import * as LocalStorage from './local-storage';
import { sendMessage } from './messages';
import { translate } from './utilities';

async function main(): Promise<void> {
  const [{ title, url }] = await apis.tabs.query({ active: true, currentWindow: true });
  if (url == null) {
    throw new Error('No URL');
  }

  const options = await LocalStorage.load(['blacklist', 'subscriptions', 'enablePathDepth']);
  const blacklist = new Blacklist(
    options.blacklist,
    Object.values(options.subscriptions).map(subscription => subscription.blacklist),
  );

  document.documentElement.lang = translate('lang');
  render(
    <BlockPopup
      blacklist={blacklist}
      close={() => window.close()}
      enablePathDepth={options.enablePathDepth}
      title={title ?? null}
      url={url}
      onBlocked={() => sendMessage('set-blacklist', blacklist.toString(), 'popup')}
    />,
    document.body,
  );
}

void main();
