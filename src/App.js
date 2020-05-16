import React from 'react';

import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';

import { StorageTable, PlayerTable, TransactionTable } from './modules/Tables.js';
import MyModal from './modules/MyModal.js';

import wowlogo from './wowlogo.png';
import './App.scss';

class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {items: [], players: {}};
  }

  // Easy way to update all data with the new info
  // and not have to code it myself
  modalSaved() {
    window.location.reload(false);
  }

  componentDidMount() {
    fetch('/getItems').then(res => res.json()).then(data => {
      this.setState({items: data})
    });

    fetch('/getPlayers').then(res => res.json()).then(data => {
      this.setState({players: data})
    });
  }

  render() {
    return (
      <>
        <div className="header-logo">
          <img src={wowlogo} alt="WoW Logo" />
          <span>Welcome to the Continuum Guild Bank</span>
        </div>
        <div>
          <MyModal whenSaved={this.modalSaved} items={this.state.items} players={this.state.players} />
          <Tabs defaultActiveKey="storage" transition={false}>
            <Tab eventKey="storage" title="Storage">
              <StorageTable items={this.state.items} />
            </Tab>
            <Tab eventKey="players" title="Player Points">
              <PlayerTable players={this.state.players} />
            </Tab>
            <Tab eventKey="transactions" title="Transactions">
              <TransactionTable />
            </Tab>
          </Tabs>
        </div>
      </>
    );
  }
}

export default App;
