import React from 'react';

import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';

export class TransactionTable extends React.Component {
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
    sleep(200).then(() => {
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
    this.setState((state, props) => {
      return {transactions: {...state.transactions, ...data}};
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

    for (const transactionId of transactionIds) {
      var transaction = transactions[transactionId];
      var row = [
        capitalize(transaction.character),
        this.parseDate(transaction.date),
        transaction.type,
        [],  // Item Name
        [],  // In
        [],  // Out
        [],  // Points
      ];

      if (Number(transaction.money) > 0) {
        row[3].push(<a href="https://wowhead.com/item=92600" className="q1" data-wh-icon-size="tiny">Gold</a>);
        row[4].push(parseGold(transaction.money));
        row[5].push('');
        row[6].push(transaction.money / 10000);
      } else if (Number(transaction.money) < 0) {
        row[3].push('Gold');
        row[4].push('');
        row[5].push(transaction.money);
        row[6].push(transaction.money);
      }

      for (const itemId in transaction.items) {
        var count = transaction.items[itemId].count;
        var points = transaction.items[itemId].points;
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


export class PlayerTable extends React.Component {
  playersToRows() {
    var rows = [];
    var players = this.props.players.mains;
    for (const playerName in players) {
      rows.push([
        capitalize(playerName),
        players[playerName].points,
      ]);
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

export class StorageTable extends React.Component {
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
    sleep(200).then(() => {
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
    for (const itemId in storage) {
      var row = [
        <a href={"https://classic.wowhead.com/item=" + itemId}>{items[itemId] || 'Unknown'}</a>,
        [],  // Quantity
        [],  // Character
        items[itemId] || '',
      ];

      if (Number(itemId) === 1) {
        row[0] = <a href="https://wowhead.com/item=92600" className="q1">Gold</a>;
        row[3] = 'Gold';

        for (const charName in storage[itemId]) {
          row[1].push(parseGold(storage[itemId][charName]));
          row[2].push(capitalize(charName));
        }
      } else {
        for (const charName in storage[itemId]) {
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
      if (y === 'gold') {return 1;}
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
    return <><span className="gold">{gold + "g"}</span> <span className="silver">{silver + "s"}</span> <span className="copper">{copper + "c"}</span></>;
  } else if (silver > 0) {
    return <><span className="silver">{silver + "s"}</span> <span className="copper">{copper + "c"}</span></>;
  } else {
    return <span className="copper">{copper + "c"}</span>;
  }
}
