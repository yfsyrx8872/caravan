import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
  signedMultisigTransaction,
  blockExplorerTransactionURL,
} from "unchained-bitcoin";
import { broadcastTransaction } from '../../blockchain';
import { wrapText } from "../../utils";

import {
  Typography,
  Box,
  FormHelperText,
  Button,
  Card,
  CardHeader,
  CardContent,
} from '@material-ui/core';
import {OpenInNew} from "@material-ui/icons";
import Copyable from "../Copyable";
import {externalLink} from "../../utils";

class Transaction extends React.Component {

  static propTypes = {
    network: PropTypes.string.isRequired,
    client: PropTypes.object.isRequired,
    inputs: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    signatureImporters: PropTypes.object.isRequired,
  };

  state = {
    error: '',
    broadcasting: false,
    txid: '',
  }

  render() {
    const { error, broadcasting, txid } = this.state;
    const signedTransaction = this.buildSignedTransaction();
    const signedTransactionHex = signedTransaction.toHex();
    return (
      <Card>
        <CardHeader title="Broadcast"/>
        <CardContent>

          <form>
            {signedTransaction &&
             <Box mt={4}>
               <Typography variant="h6">Signed Transaction</Typography>
               <Copyable text={signedTransactionHex}>
                 <small><code>{wrapText(signedTransactionHex, 128)}</code></small>
               </Copyable>
             </Box>}

            {
              txid === ''
                ?
                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!signedTransaction || broadcasting}
                    onClick={this.handleBroadcast}
                  >
                    Broadcast Transaction
                  </Button>
                  <FormHelperText error>{error}</FormHelperText>
                  <small><FormHelperText>Warning: Broadcasting this transaction cannot be undone.</FormHelperText></small>
                </Box>
              :
              <Box mt={2}>
                <Typography variant="h5">
                  <Copyable text={txid}>
                    <code>{txid}</code>
                  </Copyable>
                  &nbsp;
                  {externalLink(this.transactionURL(), <OpenInNew />)}
                </Typography>
                <p>Transaction successfully broadcast.</p>
              </Box>
            }
          </form>

        </CardContent>

      </Card>
    );
  }

  buildSignedTransaction = () => {
    const {unsignedTransaction, inputs, signatureImporters} = this.props;
    const inputsSignaturesByPublicKey = [];
    inputs.forEach((input, inputIndex) => {
      const inputSignaturesByPublicKey = {};
      Object.values(signatureImporters).forEach((signatureImporter) => {
        const signerInputPublicKey = signatureImporter.publicKeys[inputIndex];
        const signerInputSignature = signatureImporter.signature[inputIndex];
        inputSignaturesByPublicKey[signerInputPublicKey] = signerInputSignature;
      });
      inputsSignaturesByPublicKey.push(inputSignaturesByPublicKey);
    });
    return signedMultisigTransaction(unsignedTransaction, inputs, inputsSignaturesByPublicKey);
  }

  handleBroadcast = async () => {
    const {client, network} = this.props;
    const signedTransaction = this.buildSignedTransaction();
    let error = '';
    let txid = '';
    this.setState({broadcasting: true});
    try {
      txid = await broadcastTransaction(signedTransaction.toHex(), network, client);
    } catch (e) {
      console.error(e);
      error = `There was an error broadcasting the transaction.: ${e}`;
    } finally {
      this.setState({txid, error, broadcasting: false});
    }
  }

  transactionURL = () => {
    const {network} = this.props;
    const {txid} = this.state;
    return blockExplorerTransactionURL(txid, network);
  }

}

function mapStateToProps(state) {
  return {
    network: state.settings.network,
    client: state.client,
    ...state.client,
    signatureImporters: state.spend.signatureImporters,
    inputs: state.spend.transaction.inputs,
    unsignedTransaction: state.spend.transaction.unsignedTransaction,
  };
}

const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(Transaction);