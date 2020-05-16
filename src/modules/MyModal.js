import React from 'react';

import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

import TransactionEditor from './TransactionEditor.js';

export default class MyModal extends React.Component {

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
                         players={this.props.players}
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
      if (json.transactions.length === 0) {
        this.props.setSubmitted(true);
      } else {
        this.setState({phaseTwo: true, parsedTransactions: json.transactions});
      }
    } else {
      this.setState({validAddonString: false});
    }
  }

  uploadStorageData(json) {
    var bags = { ...json.bags, 1: json.money};
    var body = {character: json.character, bags: bags};
    if (json.bank !== null) {
      body.bank = json.bank;
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
                                players={this.props.players}
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
