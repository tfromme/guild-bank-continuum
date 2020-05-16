import React from 'react';

import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { Typeahead } from 'react-bootstrap-typeahead';


export default class TransactionEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      newAlts: {},
      ahValues: {},
      transactions: {},
      loading: false,
      errorText: "",
    };

    this.addTransaction = this.addTransaction.bind(this);
    this.deleteSelected = this.deleteSelected.bind(this);
    this.joinSelected = this.joinSelected.bind(this);
    this.upload = this.upload.bind(this);
  }

  componentDidMount() {
    this.setState({loading: true});

    fetch('https://api.nexushub.co/wow-classic/v1/items/sulfuras-alliance')
      .then(res => res.json()).then(data => {
        this.parseAhValues(data);
        this.setState({loading: false});
    });

    if ('initialTransactions' in this.props) {
      this.parseInitial(this.props.initialTransactions);
    }
  }

  parseAhValues(data) {
    var items = {}
    items['1'] = 1;
    for (const index in data.data) {
      items[data.data[index].itemId] = parseInt(data.data[index].marketValue) / 10000;
    }

    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      for (const index in transactions) {
        for (const item of transactions[index].items) {
          var count = Number(item.inCount) + Number(item.outCount);
          item.points = count * items[item.itemId]
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
        player: transaction.sender,
        type: 'donation',
        items: [],
      };
      if (Number(transaction.money) !== 0) {
        var money = parseInt(transaction.money) / 10000;
        parsedTransaction.items.push({
          'itemId': '1',
          'inCount': money > 0 ? money : 0,
          'outCount': money < 0 ? -money : 0,
          'points': 0,
        });
      }
      for (const itemId in transaction.items) {
        var count = parseInt(transaction.items[itemId]);
        parsedTransaction.items.push({
          'itemId': itemId,
          'inCount': count > 0 ? count : 0,
          'outCount': count < 0 ? -count : 0,
          'points': 0,
        });
      }

      parsedTransactions[index] = parsedTransaction;
    });
    this.setState({transactions: parsedTransactions});
  }

  deleteSelected() {
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      for (const index in transactions) {
        if (transactions[index].checked) {
          delete transactions[index];
        }
      }
      return {transactions: transactions};
    });
  }

  joinSelected() {
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      var firstTransaction = null;
      var firstIndex = -1;
      for (const index in transactions) {
        if (transactions[index].checked) {
          if (firstTransaction === null) {
            firstTransaction = { ...transactions[index] };
            firstIndex = index;
          } else if (firstTransaction.player !== transactions[index].player) {
            return {errorText: "Selected transactions must be with the same player."};
          } else {
            firstTransaction.items = [...firstTransaction.items, ...transactions[index].items];
            delete transactions[index];
          }
        }
      }
      if (firstTransaction !== null) {
        firstTransaction.items = this.consolidateItems(firstTransaction.items);
        transactions[firstIndex] = firstTransaction;
      }
      return {transactions: transactions, errorText: ""};
    });
  }

  consolidateItems(items) {
    var newItems = {};
    for (var item of items) {
      if (item.itemId in newItems) {
        var count = newItems[item.itemId].inCount - newItems[item.itemId].outCount + item.inCount - item.outCount;
        newItems[item.itemId].inCount = count > 0 ? count : 0;
        newItems[item.itemId].outCount = count < 0 ? -count : 0;

        var points = newItems[item.itemId].inCount > 0 ? newItems[item.itemId].points : -newItems[item.itemId].points;
        points += item.inCount > 0 ? item.points : -item.points;
        newItems[item.itemId].points = Math.abs(points);
      } else {
        newItems[item.itemId] = { ...item };
      }
    }
    var newItemsArray = [];
    for (const itemId in newItems) {
      newItemsArray.push(newItems[itemId]);
    }
    return newItemsArray;
  }

  addTransaction() {
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      var maxIndex = Object.keys(transactions).reduce((a, b) => parseInt(a) > parseInt(b) ? a : b);
      transactions[parseInt(maxIndex) + 1] = {
        variant: 'manual',
        checked: false,
        player: '',
        type: 'donation',
        items: [],
      }
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

  upload(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.target.getElementsByClassName('is-invalid').length > 0) {
      this.setState({errorText: "Double Check for Invalid Input."});
    } else {
      this.setState({errorText: ""});
    }
  }

  handleCheck(index, e) {
    const checked = e.target.checked;
    this.setState((state, props) => {
      var transactions = { ...state.transactions };
      transactions[index].checked = checked;
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
          <TransactionEditorRow index={index}
                                editTransaction={(data) => this.editTransaction(index, data)}
                                data={transaction}
                                items={this.props.items}
                                ahValues={this.state.ahValues}
                                players={this.props.players}
          />
        </Form.Check>
      );
    }

    return (
      <>
        <Form onSubmit={this.upload} noValidate>
          <Button inline variant="outline-info" onClick={this.deleteSelected} className="transactionTopButton">
            Delete Selected
          </Button>
          <Button inline variant="outline-info" onClick={this.joinSelected} className="transactionTopButton">
            Join Selected
          </Button>
          <span className="errorText">{this.state.errorText}</span>
          <Button inline variant="primary" type="submit" className="editTransactionUploadButton">
            Upload
          </Button>
          <Form.Group controlId="editTransactionRows">
            {rowItems}
          </Form.Group>
        </Form>
        <Button variant="outline-info" onClick={this.addTransaction} className="addTransactionButton">
          Add Transaction
        </Button>
      </>
    );
  }
}


class TransactionEditorRow extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.onTypeChange = this.onTypeChange.bind(this);
    this.addItem = this.addItem.bind(this);
  }

  onTypeChange(e) {
    var data = { ...this.props.data };
    data.type = e.target.value;
    this.props.editTransaction(data);
  }

  addItem() {
    var data = { ...this.props.data };
    data.items.push({
      'itemId': '1',
      'inCount': 0,
      'outCount': 0,
      'points': 0,
    });
    this.props.editTransaction(data);
  }

  removeItem(index, e) {
    var data = { ...this.props.data };
    data.items.splice(index, 1);
    this.props.editTransaction(data);
  }

  onItemNameChange(index, s) {
    if (s.length > 0 && s[0].itemId !== Number(this.props.data.items[index].itemId)) {
      var data = { ...this.props.data };

      data.items[index].itemId = s[0].itemId;

      var count = Number(data.items[index].inCount) + Number(data.items[index].outCount);
      data.items[index].points = count * this.props.ahValues[s[0].itemId];

      this.props.editTransaction(data);
    }
  }

  onCountChange(index, isIn, e) {
    var data = { ...this.props.data };
    if (isIn) {
      data.items[index].inCount = e.target.value;
      data.items[index].outCount = 0;
    } else {
      data.items[index].inCount = 0;
      data.items[index].outCount = e.target.value;
    }

    data.items[index].points = e.target.value * this.props.ahValues[data.items[index].itemId];

    this.props.editTransaction(data);
  }

  onPointsChange(index, e) {
    var data = { ...this.props.data };
    data.items[index].points = e.target.value;
    this.props.editTransaction(data);
  }

  isValidNumber(str) {
    return /^\d*\.?\d+$/.test(str);
  }

  isValidInteger(str) {
    return /^\d+$/.test(str);
  }

  getItemRows() {
    var rows = [];
    if (this.props.data.items.length === 0) {
      rows.push(
        <>
          <Form.Group as={Col} controlId={"tranactionEditItem0Name"+this.props.index}>
            <Form.Label><b>Item Name</b></Form.Label>
            <Button variant="outline-info" onClick={this.addItem} className="addItemButton">
              Add Item
            </Button>
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0In"+this.props.index}>
            <Form.Label><b>In</b></Form.Label>
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Out"+this.props.index}>
            <Form.Label><b>Out</b></Form.Label>
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Value"+this.props.index}>
            <Form.Label><b>Value</b></Form.Label>
          </Form.Group>
          <Col xs="1" />
        </>
      );
    } else {
      var item = this.props.data.items[0];
      rows.push(
        <>
          <Form.Group as={Col} controlId={"tranactionEditItem0Name"+this.props.index}>
            <Form.Label><b>Item Name</b></Form.Label>
            <Typeahead id={"transactionEditItem0Typeahead"+this.props.index}
                       labelKey="name"
                       onChange={(s) => this.onItemNameChange(0, s)}
                       options={this.props.items}
                       selected={[this.props.items.find(i => i.itemId === Number(item.itemId))]}
                       minLength={4}
                       highlightOnlyResult
            />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0In"+this.props.index}>
            <Form.Label><b>In</b></Form.Label>
            <Form.Control type="text"
                          value={item.inCount}
                          isInvalid={Number(item.itemId) === 1 ? !this.isValidNumber(item.inCount) : !this.isValidInteger(item.inCount)}
                          onChange={(e) => this.onCountChange(0, true, e)}
            />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Out"+this.props.index}>
            <Form.Label><b>Out</b></Form.Label>
            <Form.Control type="text"
                          value={item.outCount}
                          isInvalid={Number(item.itemId) === 1 ? !this.isValidNumber(item.outCount) : !this.isValidInteger(item.outCount)}
                          onChange={(e) => this.onCountChange(0, false, e)}
            />
          </Form.Group>

          <Form.Group as={Col} xs="1" controlId={"tranactionEditItem0Value"+this.props.index}>
            <Form.Label><b>Value</b></Form.Label>
            <Form.Control type="text" disabled={this.props.data.type !== 'donation'}
                          value={this.props.data.type === 'donation' ? item.points : 0}
                          isInvalid={!this.isValidNumber(this.props.data.type === 'donation' ? item.points : 0)}
                          onChange={(e) => this.onPointsChange(0, e)}
            />
          </Form.Group>

          <Col xs="1">
            <Form.Label style={{'color': 'white'}}><b>X</b></Form.Label>
            <div><Button variant="outline-danger" onClick={(e) => this.removeItem(0, e)}>X</Button></div>
          </Col>
        </>
      );
    }
    this.props.data.items.forEach((item, index) => {
      if (index !== 0) {
        rows.push(
          <Form.Row key={index}>
            <Col />
            <Col />
            <Form.Group as={Col} controlId={"tranactionEditItem"+index+"Name"+this.props.index}>
              <Typeahead id={"transactionEditItem"+index+"Typeahead"+this.props.index}
                         labelKey="name"
                         onChange={(s) => this.onItemNameChange(index, s)}
                         options={this.props.items}
                         selected={[this.props.items.find(i => i.itemId === Number(item.itemId))]}
                         minLength={4}
                         highlightOnlyResult
              />
            </Form.Group>

            <Form.Group as={Col} xs="1" controlId={"tranactionEditItem"+index+"In"+this.props.index}>
              <Form.Control type="text"
                            value={item.inCount}
                            isInvalid={Number(item.itemId) === 1 ? !this.isValidNumber(item.inCount) : !this.isValidInteger(item.inCount)}
                            onChange={(e) => this.onCountChange(0, true, e)}
              />
            </Form.Group>

            <Form.Group as={Col} xs="1" controlId={"tranactionEditItem"+index+"Out"+this.props.index}>
              <Form.Control type="text"
                            value={item.outCount}
                            isInvalid={Number(item.itemId) === 1 ? !this.isValidNumber(item.outCount) : !this.isValidInteger(item.outCount)}
                            onChange={(e) => this.onCountChange(0, false, e)}
              />
            </Form.Group>

            <Form.Group as={Col} xs="1" controlId={"tranactionEditItem"+index+"Value"+this.props.index}>
              <Form.Control type="text" disabled={this.props.data.type !== 'donation'}
                            value={this.props.data.type === 'donation' ? item.points : 0}
                            isInvalid={!this.isValidNumber(this.props.data.type === 'donation' ? item.points : 0)}
                            onChange={(e) => this.onPointsChange(index, e)}
              />
            </Form.Group>

            <Col xs="1">
              <div><Button variant="outline-danger" onClick={(e) => this.removeItem(index, e)}>X</Button></div>
            </Col>
          </Form.Row>
        );
      }
    });

    return rows;
  }

  render() {
    const typeDisplay = {
      'donation': 'Donation/Withdrawal',
      'raidloot': 'Raid Loot',
      'investment': 'Investment',
      'guild': 'Guild Benefit',
      'crafting': 'Crafting',
    };

    var rows = this.getItemRows();
    var firstRow = rows.shift();

    var buttonRow = "";
    if (this.props.data.items.length !== 0) {
      buttonRow = (
        <Form.Row>
          <Col />
          <Col />
          <Col>
            <Button variant="outline-info" onClick={this.addItem} className="addItemButton">
              Add Item
            </Button>
          </Col>
          <Col xs="1" />
          <Col xs="1" />
          <Col xs="1" />
          <Col xs="1" />
        </Form.Row>
      );
    }

    return (
      <div className={"transactionEditorRow" + (this.props.data.items.length === 0 ? " is-invalid" : "")}>
        <Form.Row>

          <Form.Group as={Col} controlId={"transactionEditName"+this.props.index}>
            <Form.Label><b>Player</b></Form.Label>
            <Form.Control plaintext readOnly defaultValue={this.props.data.player} />
          </Form.Group>

          <Form.Group as={Col} controlId={"transactionEditType"+this.props.index}>
            <Form.Label><b>Type</b></Form.Label>
            <Form.Control as="select" value={this.props.data.type} onChange={this.onTypeChange}>
              {Object.keys(typeDisplay).map((key, index) =>
                <option key={index} value={key}>{typeDisplay[key]}</option>
              )}
            </Form.Control>
          </Form.Group>
          {firstRow}
        </Form.Row>
        {rows}
        {buttonRow}
      </div>
    );
  }
}
