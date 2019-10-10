import { getContainer } from './run';
import { AcrylConsoleAPI } from '../../AcrylConsoleAPI';
import { libs, TTx } from '@acryl/acryl-transactions';
import axios from 'axios';

import { Console } from '..';

export const updateIFrameEnv = (env: any) => {
    try {
        AcrylConsoleAPI.setEnv(env);

        const iframeWindow = getContainer().contentWindow;

        iframeWindow['env'] = env;
    } catch (e) {
        console.error(e);
    }
};

export const bindAPItoIFrame = (consoleApi: AcrylConsoleAPI, console: Console, frame: any) => {
    const apiMethodWrappers: IApiMethodWrappers = getApiMethodWrappers(consoleApi, console);

    try {
        const iframeWindow = frame.contentWindow;

        Object.keys(consoleApi)
            .forEach(key => {
                key in apiMethodWrappers
                    ? iframeWindow[key] = apiMethodWrappers[key]
                    : iframeWindow[key] = consoleApi[key];
            });
    } catch (e) {
        console.error(e);
    }
};

interface IApiMethodWrappers {
    [key: string]: any
}

const getNetworkByte = (apiBase: string) => {
    return axios.get(`${apiBase}/addresses`)
        .then(res => {
            const address = res.data[0];

            const byte = libs.marshall.serializePrimitives.BASE58_STRING(address)[1];

            return String.fromCharCode(byte);
        });
};

const getApiMethodWrappers = (consoleApi: AcrylConsoleAPI, console: Console): IApiMethodWrappers => {
    return {
        broadcast: async (tx: TTx, apiBaseParam?: string) => {
            const apiBase = new URL(apiBaseParam || AcrylConsoleAPI.env.API_BASE).href;

            const nodes = ['https://nodes.acrylplatform.com/', 'https://nodestestnet.acrylplatform.com/'];

            const pushExplorerLinkToConsole = (href: string) => {
                const htmlString = `<a href="${href}" target="_blank">Link to transaction in acryl-explorer</a>`;

                console.push({
                    html: true,
                    value: htmlString,
                    type: 'log',
                });
            };

            const generateExplorerLinkToTx = (networkByte: string, txId: number) => {
                return (networkByte === 'A')
                    ? `https://explorer.acrylplatform.com/tx/${txId}`
                    : `https://explorertestnet.acrylplatform.com/tx/${txId}`;
            };


            const res = await consoleApi.broadcast(tx, apiBase);

            if (nodes.includes(apiBase)) {
                const networkByte = apiBase === 'https://nodes.acrylplatform.com/'
                    ? 'A'
                    : 'K';

                const href = generateExplorerLinkToTx(networkByte, res.id);

                pushExplorerLinkToConsole(href);
            } else {
                try {
                    let networkByte = await getNetworkByte(apiBase);

                    const isAcrylNetwork = networkByte === 'A' || networkByte === 'K';

                    if (isAcrylNetwork) {
                        const href = generateExplorerLinkToTx(networkByte, res.id);

                        pushExplorerLinkToConsole(href);
                    }
                } catch (e) {
                    console.log('Error occured during network byte check');
                }
            }

            return res;

        }
    };
};
