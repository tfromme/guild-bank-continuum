import React from 'react';

import Col from 'react-bootstrap/Col';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

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
          <MyModal whenSaved={this.modalSaved} items={this.state.items} />
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

class TransactionTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {transactions: {}};
    this.pageNum = 1;

    this.loadMore = this.loadMore.bind(this);
  }

  componentDidMount() {
    fetch('/getTransactions').then(res => res.json()).then(data => {
      this.parseTransactions(data);
    });
  }

  componentDidUpdate() {
    sleep(150).then(() => {
      window.$WowheadPower.refreshLinks();
    });
  }

  loadMore(e) {
    this.pageNum += 1;
    fetch('/getTransactions?page=' + this.pageNum).then(res => res.json()).then(data => {
      if (Object.keys(data).length === 0) {
        this.pageNum -= 1;
      }
      this.parseTransactions(data);
    });
  }

  parseTransactions(data) {
    var currentTransactions = this.state.transactions;
    this.setState({
      transactions: {...currentTransactions, ...data}
    });
  }

  parseDate(dateString) {
    dateString = String(dateString);
    var day = dateString.substring(4, 6);
    var month = dateString.substring(2, 4);
    var year = dateString.substring(0, 2);
    return month + "/" + day + "/" + year
  }

  transactionsToRows() {
    var rows = [];
    var transactions = this.state.transactions;

    var transactionIds = Object.keys(transactions).sort((a, b) => {
      var x = Number(a);
      var y = Number(b);
      if (x < y) {return -1;}
      if (x > y) {return 1;}
      return 0;
    }).reverse();

    for (var transactionId of transactionIds) {
      var transaction = transactions[transactionId];
      var row = [
        capitalize(transaction['character']),
        this.parseDate(transaction['date']),
        transaction['type'],
        [],  // Item Name
        [],  // In
        [],  // Out
        [],  // Points
      ];

      if (Number(transaction['money']) > 0) {
        row[3].push(<a href="https://wowhead.com/item=92600" className="q1" data-wh-icon-size="tiny">Gold</a>);
        row[4].push(parseGold(transaction['money']));
        row[5].push('');
        row[6].push(transaction['money'] / 10000);
      } else if (Number(transaction['money']) < 0) {
        row[3].push('Gold');
        row[4].push('');
        row[5].push(transaction['money']);
        row[6].push(transaction['money']);
      }

      for (var itemId in transaction['items']) {
        var count = transaction['items'][itemId]['count'];
        var points = transaction['items'][itemId]['points'];
        row[3].push(<a href={"https://classic.wowhead.com/item=" + itemId} data-wh-rename-link="true" data-wh-icon-size="tiny"> </a>);
        row[6].push(points);
        if (count > 0) {
          row[4].push(count);
          row[5].push('');
        } else {
          row[4].push('');
          row[5].push(count);
        }
      }

      rows.push(row);
    }

    return rows;
  }

  render() {
    const headers = ['Name', 'Date', 'Type', 'Item', 'In', 'Out', 'Points'];
    const headerItems = headers.map((header, index) =>
      <th key={index}>{header}</th>
    );

    const rows = this.transactionsToRows().map((row, index) =>
      <Row key={index} data={row} />
    );
    return (
      <Table striped bordered variant="dark" className="transactionTable">
        <thead>
          <tr>{headerItems}</tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
        <tfoot>
          <tr className="buttonRow">
            <td colSpan="7" className="buttonRow">
              <Button variant="outline-info" onClick={this.loadMore} className="button">
                Load More
              </Button>
            </td>
          </tr>
        </tfoot>
      </Table>
    );
  }
}


class PlayerTable extends React.Component {
  playersToRows() {
    var rows = [];
    var players = this.props.players.mains;
    for (var playerName in players) {
      var row = [
        capitalize(playerName),
        players[playerName].points,
      ];
      rows.push(row);
    }

    // Sort Alphabetically by Item Name
    rows.sort((a, b) => {
      var x = a[0].toLowerCase();
      var y = b[0].toLowerCase();
      if (x < y) {return -1;}
      if (x > y) {return 1;}
      return 0;
    });

    return rows;
  }

  render() {
    const headers = ['Name', 'Points'];
    const headerItems = headers.map((header, index) =>
      <th key={index}>{header}</th>
    );

    const rows = this.playersToRows().map((row, index) =>
      <Row key={index} data={row} />
    );
    return (
      <Table striped bordered variant="dark" className="playerTable">
        <thead>
          <tr>{headerItems}</tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </Table>
    );
  }
}

class StorageTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {storage: {}};
  }

  componentDidMount() {
    fetch('/getStorage').then(res => res.json()).then(data => {
      this.parseStorage(data);
    });
  }

  componentDidUpdate() {
    sleep(150).then(() => {
      window.$WowheadPower.refreshLinks();
    });
  }

  parseItems(data) {
    return data.reduce((acc, cur) => {
      acc[cur.itemId] = cur.name;
      return acc;
    }, {});
  }

  parseStorage(data) {
    this.setState({ storage: data });
  }

  storageToRows() {
    var rows = [];
    var storage = this.state.storage;
    var items = this.parseItems(this.props.items);
    for (var itemId in storage) {
      var row = [
        <a href={"https://classic.wowhead.com/item=" + itemId}><span>{items[itemId] || 'Unknown'}</span></a>,
        [],  // Quantity
        [],  // Character
        items[itemId] || '',
      ];

      if (Number(itemId) === 1) {
        row[0] = <a href="https://wowhead.com/item=92600" className="q1">Gold</a>;
        row[3] = 'Gold';

        for (var charName in storage[itemId]) {
          row[1].push(parseGold(storage[itemId][charName]));
          row[2].push(capitalize(charName));
        }
      } else {
        for (charName in storage[itemId]) {
          row[1].push(storage[itemId][charName]);
          row[2].push(capitalize(charName));
        }
      }


      rows.push(row);
    }

    // Sort Alphabetically by Item Name
    rows.sort((a, b) => {
      var x = a[3].toLowerCase();
      var y = b[3].toLowerCase();
      if (x === 'gold') {return -1;}
      if (x < y) {return -1;}
      if (x > y) {return 1;}
      return 0;
    });

    for (row of rows) {
      row.pop();
    }

    return rows;
  }

  render() {
    const headers = ['Name', 'Quantity', 'Character'];
    const headerItems = headers.map((header, index) =>
      <th key={index}>{header}</th>
    );

    const rows = this.storageToRows().map((row, index) =>
      <Row key={index} data={row} />
    );
    return (
      <Table striped bordered variant="dark" className="storageTable">
        <thead>
          <tr>{headerItems}</tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </Table>
    );
  }
}

function Row(props) {
  const rowItems = props.data.map((item, index) => {
    if (Array.isArray(item)) {
      if (item.length > 0) {
        return <td key={index}>{item.reduce((result, item) => <>{result}<br />{item}</>)}</td>;
      } else {
        return <td key={index}></td>
      }
    } else {
      return <td key={index}>{item}</td>
    }
  });

  return (
    <tr>{rowItems}</tr>
  );
}


class MyModal extends React.Component {

  // Props has whenSaved - call to reload UI
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
      submitted: false,
    };

    this.showModal = this.showModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.resetModal = this.resetModal.bind(this);
    this.setSubmitted = this.setSubmitted.bind(this);
  }

  showModal() {
    this.setState({showModal: true});
  }

  closeModal() {
    this.setState({showModal: false});
  }

  resetModal() {
    if (this.state.submitted) {
      this.props.whenSaved();
    }
  }

  setSubmitted(value) {
    this.setState({submitted: value});
  }

  render() {
    return (
      <>
        <Button variant="primary" onClick={this.showModal} className="uploadButton">
          Upload Data
        </Button>
        <Modal show={this.state.showModal} onHide={this.closeModal} onExited={this.resetModal} dialogClassName="modal-xl" centered scrollable>
          <Modal.Header closeButton>
            <Modal.Title>Upload Data</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <MyModalBody submitted={this.state.submitted}
                         setSubmitted={this.setSubmitted}
                         items={this.props.items}
            />
          </Modal.Body>
        </Modal>
      </>
    );
  }
}

class MyModalBody extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      addonString: "",
      validAddonString: true,
      phaseTwo: false,
      loading: false,
      error: false,
      parsedTransactions: "",
    };

    this.handleAddonStringChange = this.handleAddonStringChange.bind(this);
    this.parseAddonString = this.parseAddonString.bind(this);
  }

  handleAddonStringChange(e) {
    this.setState({addonString: e.target.value});
    if (this.isValidJSON(e.target.value)) {
      this.setState({validAddonString: true});
    }
  }

  isValidJSON(str) {
    try {
      var json = JSON.parse(str);
    } catch (e) {
      return false;
    }
    if (typeof json !== 'object') {
      return false;
    }
    return (json.hasOwnProperty('transactions')
         && json.hasOwnProperty('bags')
         && json.hasOwnProperty('bank')
         && json.hasOwnProperty('money')
         && json.hasOwnProperty('character'));
  }

  parseAddonString(e) {
    e.preventDefault();
    if (this.isValidJSON(this.state.addonString)) {
      this.setState({phaseTwo: true});
      var json = JSON.parse(this.state.addonString);
      this.uploadStorageData(json);
      if (json['transactions'].length === 0) {
        this.props.setSubmitted(true);
      } else {
        this.setState({phaseTwo: true, parsedTransactions: json['transactions']});
      }
    } else {
      this.setState({validAddonString: false});
    }
  }

  uploadStorageData(json) {
    var bags = { ...json['bags'], 1: json['money']};
    var body = {character: json['character'], bags: bags};
    if (json['bank'] !== null) {
      body['bank'] = json['bank'];
    }

    const requestOptions = {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)};
    fetch('/updateStorage', requestOptions)
      .then(async response => {
        const data = await response;

        if (!response.ok) {
          const error = (data && data.message) || response.status;
          return Promise.reject(error);
        }
        this.setState({loading: false});
      })
      .catch(error => {
        this.props.setSubmitted(false);
        this.setState({loading: false, error: true});
        console.error('There was an error!', error);
      });
    this.setState({loading: true});
  }

  render() {
    if (this.state.error) {
      return "There was an error.  Please try again later.";
    } else if (this.state.loading) {
      return <Spinner animation="border" variant="primary" />
    } else if (this.props.submitted) {  // Submitted, can only exit
      return "Submitted"
    } else if (this.state.phaseTwo) {   // Phase Two on success of Storage upload
      return <TransactionEditor setParentState={this.setState.bind(this)}
                                initialTransactions={this.state.parsedTransactions}
                                items={this.props.items}
             />
    } else {                            // Phase One on open
      return (
        <Form validated={this.state.validAddonString} onSubmit={this.parseAddonString}>
          <Form.Group controlId="inputAddonString">
            <Form.Label>Paste Addon String Below</Form.Label>
            <Form.Control as="textarea" rows="5" onChange={this.handleAddonStringChange} isInvalid={!this.state.validAddonString}/>
            <Form.Control.Feedback type="invalid">Invalid Addon String</Form.Control.Feedback>
          </Form.Group>
          <Button type="submit">Upload</Button>
        </Form>
      );
    }
  }
}

class TransactionEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      alts: {},
      newAlts: {},
      points: {},
      ahValues: {},
      transactions: {},
      loading: false,
    };

    this.addTransaction = this.addTransaction.bind(this);
  }

  componentDidMount() {
    this.setState({loading: true});

    fetch('/getPlayers').then(res => res.json()).then(data => {
      this.parsePlayers(data);
    });

    fetch('https://api.nexushub.co/wow-classic/v1/items/sulfuras-alliance')
      .then(res => res.json()).then(data => {
        this.parseAhValues(data);
        this.setState({loading: false});
    });

    if ('initialTransactions' in this.props) {
      this.parseInitial(this.props.initialTransactions);
    }
  }

  parsePlayers(players) {
    this.setState({alts: players['alts'], points: players['mains']});
  }

  parseAhValues(data) {
    var items = {}
    for (const index in data['data']) {
      items[data['data'][index]['itemId']] = parseInt(data['data'][index]['marketValue']);
    }

    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      for (const index in transactions) {
        for (const itemId in transactions[index]['items']) {
          if (itemId !== '1') {  // Special case for Gold
            transactions[index]['items'][itemId]['points'] = transactions[index]['items'][itemId]['count'] * items[itemId]
          }
        }
      }

      return {ahValues: items, transactions:transactions};
    });
  }

  parseInitial(transactions) {
    var parsedTransactions = {};
    transactions.forEach((transaction, index) => {
      var parsedTransaction = {
        variant: 'parsed',
        checked: false,
        player: transaction['sender'],
        type: 'donation',
        items: {},
      };
      for (const itemId in transaction['items']) {
        parsedTransaction['items'][itemId] = {'count': parseInt(transaction['items'][itemId]), 'points': 0};
      }
      if (Number(transaction['money']) > 0) {
        parsedTransaction['items']['1'] = {'count': parseInt(transaction['money']), 'points': parseInt(transaction['money'])};
      }

      parsedTransactions[index] = parsedTransaction;
    });
    this.setState({transactions: parsedTransactions});
  }

  addTransaction() {
    console.log('Called');
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      console.log(transactions);
      var maxIndex = Object.keys(transactions).reduce((a, b) => parseInt(a) > parseInt(b) ? a : b);
      transactions[parseInt(maxIndex) + 1] = {
        variant: 'manual',
        checked: false,
        player: '',
        type: 'donation',
        items: {},
      }
      console.log(transactions);
      return {transactions: transactions};
    });
  }

  editTransaction(index, data) {
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      transactions[index] = data;
      return {transactions: transactions};
    });
  }

  handleCheck(index, e) {
    const checked = e.target.checked;
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      transactions[index]['checked'] = checked;
      return {transactions: transactions};
    });
  }

  render() {
    if (this.state.loading) {
      return <Spinner animation="border" variant="primary" />
    }

    var transactions = this.state.transactions;
    var rowItems = [];
    for (const index in transactions) {
      var transaction = transactions[index];
      rowItems.push(
        <Form.Check key={index} type="checkbox" id={"editTransactionRowCheck" + index}>
          <Form.Check.Input type="checkbox" onChange={(e) => this.handleCheck(index, e)} />
          <Form.Check.Label>
            <TransactionEditorRow index={index}
                                  editTransaction={(data) => this.editTransaction(index, data)}
                                  data={transaction}
                                  items={this.props.items}
            />
          </Form.Check.Label>
        </Form.Check>
      );
    }

    return (
      <>
        <Form onSubmit={(e) => e.preventDefault()}>
          <Form.Group controlId="editTransactionRows">
            {rowItems}
          </Form.Group>
        </Form>
        <Button variant="outline-info" onClick={this.addTransaction} className="addTransactionButton">
          Add More
        </Button>
      </>
    );
  }
}


class TransactionEditorRow extends React.Component {

  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    const typeDisplay = {
      'donation': 'Donation/Withdrawal',
      'raidloot': 'Raid Loot',
      'investment': 'Investment',
      'guild': 'Guild Benefit',
      'crafting': 'Crafting',
    };

    return (
      <div className="transactionEditorRow">
        <Form.Row>

          <Form.Group as={Col} controlId={"transactionEditName"+this.props.index}>
            <Form.Label><b>Player</b></Form.Label>
            <Form.Control plaintext readOnly defaultValue={this.props.data.player} />
          </Form.Group>

          <Form.Group as={Col} controlId={"transactionEditType"+this.props.index}>
            <Form.Label><b>Type</b></Form.Label>
            <Form.Control as="select" value={typeDisplay[this.props.data.type]}>
              {Object.keys(typeDisplay).map((key, index) =>
                <option key={index}>{typeDisplay[key]}</option>
              )}
            </Form.Control>
          </Form.Group>

          <Form.Group as={Col} controlId={"tranactionEditItem0Name"+this.props.index}>
            <Form.Label><b>Item Name</b></Form.Label>
            <Form.Control type="text" defaultValue="testName" />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0In"+this.props.index}>
            <Form.Label><b>In</b></Form.Label>
            <Form.Control type="text" defaultValue="testIn" />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Out"+this.props.index}>
            <Form.Label><b>Out</b></Form.Label>
            <Form.Control type="text" defaultValue="testOut" />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Value"+this.props.index}>
            <Form.Label><b>Value</b></Form.Label>
            <Form.Control type="text" defaultValue="1.5" />
          </Form.Group>

          <Col xs="1">
            <Form.Label style={{'color': 'white'}}><b>X</b></Form.Label>
            <div><Button variant="outline-danger">X</Button></div>
          </Col>

        </Form.Row>
        <Form.Row>
          <Col />
          <Col />
          <Form.Group as={Col} controlId={"tranactionEditItem0Name"+this.props.index}>
            <Form.Control type="text" defaultValue="testName" />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0In"+this.props.index}>
            <Form.Control type="text" defaultValue="testIn" />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Out"+this.props.index}>
            <Form.Control type="text" defaultValue="testOut" />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Value"+this.props.index}>
            <Form.Control type="text" defaultValue="1.25" />
          </Form.Group>

          <Col xs="1">
            <Button variant="outline-danger">X</Button>
          </Col>

        </Form.Row>
      </div>
    );
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function parseGold(money) {
  var copper = Math.floor(Number(money) % 100);
  var silver = Math.floor((Number(money) % 10000) / 100);
  var gold = Math.floor(Number(money) / 10000);

  if (gold > 0) {
    return <><span className="gold">{gold + "g"}</span>  <span className="silver">{silver + "s"}</span> <span className="copper">{copper + "c"}</span></>;
  } else if (silver > 0) {
    return <><span className="silver">{silver + "s"}</span> <span className="copper">{copper + "c"}</span></>;
  } else {
    return <span className="copper">{copper + "c"}</span>;
  }
}

export default App;
