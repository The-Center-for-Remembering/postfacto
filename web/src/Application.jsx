/*
 * Postfacto, a free, open-source and self-hosted retro tool aimed at helping
 * remote teams.
 *
 * Copyright (C) 2016 - Present Pivotal Software, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 *
 * it under the terms of the GNU Affero General Public License as
 *
 * published by the Free Software Foundation, either version 3 of the
 *
 * License, or (at your option) any later version.
 *
 *
 *
 * This program is distributed in the hope that it will be useful,
 *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *
 * GNU Affero General Public License for more details.
 *
 *
 *
 * You should have received a copy of the GNU Affero General Public License
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react';
import types from 'prop-types';
import {useStore} from 'p-flux';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import {Provider} from 'react-redux';
import {bindActionCreators} from 'redux';
import Grapnel from 'grapnel';
import {ConnectedRouter} from './components/router';
import {ConnectedHeader} from './components/shared/header';
import Logger from './helpers/logger';

import SessionWebsocket from './components/session_websocket';

import apiDispatcher from './dispatchers/api_dispatcher';
import mainDispatcher from './dispatchers/main_dispatcher';
import analyticsDispatcher from './dispatchers/analytics_dispatcher';
import * as mainActions from './redux/actions/main_actions';
import * as apiActions from './redux/actions/api_actions';
import * as routerActions from './redux/actions/router_actions';
import makeReduxStore from './redux/store';
import RetroClient from './api/retro_client';
import AnalyticsClient from './helpers/analytics_client';

const muiTheme = getMuiTheme({
  fontFamily: 'Karla',
});

let reduxStore;
const router = new Grapnel({pushState: true});
const retroClient = new RetroClient(
  () => global.Retro.config.api_base_url,
  () => localStorage.getItem('authToken'),
  () => reduxStore.dispatch(mainActions.setNotFound({api_server_not_found: true})),
);

const analyticsClient = new AnalyticsClient(() => global.Retro.config.enable_analytics);
reduxStore = makeReduxStore(router, retroClient, analyticsClient);

class Application extends React.Component {
  static propTypes = {
    config: types.object.isRequired,
  };

  componentDidMount() {
    Logger.info('Application started');
    reduxStore.dispatch(apiActions.retrieveConfig());

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    const width = window.innerWidth;
    reduxStore.dispatch({
      type: 'WINDOW_SIZE_UPDATED',
      payload: {
        isMobile640: width < 640,
        isMobile1030: width <= 1030,
      },
    });
  };

  updateWebsocketSession = (session) => {
    reduxStore.dispatch(mainActions.updateWebsocketSession(session));
  };

  render() {
    const {config} = this.props;
    const {websocket_url} = config;
    return (
      <Provider store={reduxStore}>
        <MuiThemeProvider muiTheme={muiTheme}>
          <div className="retro-application">

            <ConnectedHeader config={config}/>
            <ConnectedRouter config={config} router={router}/>
            <SessionWebsocket url={websocket_url} websocketSessionDataReceived={this.updateWebsocketSession}/>
          </div>
        </MuiThemeProvider>
      </Provider>
    );
  }
}

const mainBoundActions = bindActionCreators(mainActions, reduxStore.dispatch);
const routerBoundActions = bindActionCreators(routerActions, reduxStore.dispatch);
const apiBoundActions = bindActionCreators(apiActions, reduxStore.dispatch);
export default useStore(
  Application,
  {
    actions: [],
    dispatcherHandlers: [
      mainDispatcher(mainBoundActions, routerBoundActions),
      apiDispatcher(apiBoundActions),
      analyticsDispatcher(analyticsClient),
    ],
  },
);
