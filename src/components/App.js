import Decentragram from '../abis/Decentragram.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

// Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values

class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }


  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram: null,
      images: [],
      loading: true
    }

    this.uploadImage = this.uploadImage.bind(this)
    this.tipImageOwner = this.tipImageOwner.bind(this)
    this.captureFile = this.captureFile.bind(this)
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3)
      window.web3 = new Web3(window.web3.currentProvider)
    else
      window.alert('No Eth driver detected in your browser. You should consider trying MetaMask!')
  }

  async loadBlockchainData() {
    const web3 = window.web3

    // Load account
    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = Decentragram.networks[networkId]

    if (networkData) {
      const decentragram = new web3.eth.Contract(Decentragram.abi, networkData.address)
      const imagesCount = await decentragram.methods.imageCount().call()

      this.setState({ decentragram })
      this.setState({ imagesCount })

      // Load images
      for (var i = 1; i <= imagesCount; i++) {
        const image = await decentragram.methods.images(i).call()
        console.log(image)
        this.setState({
          images: [...this.state.images, image]
        })
      }

      // Sort images. Show highest tipped images first
      this.setState({
        images: this.state.images.sort((a, b) => b.tipAmount - a.tipAmount)
      })

      this.setState({ loading: false })

    } else
      window.alert('Decentragram contract not deployed to detected network.')
  }

  captureFile = event => {

    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({ buffer: Buffer(reader.result) })
      console.log('buffer', this.state.buffer)
    }
  }

  uploadImage = description => {
    console.log("Submitting file to ipfs...")

    // adding file to the IPFS
    ipfs.add(this.state.buffer, (error, result) => {
      console.log('Ipfs result', result)
      if (error) {
        console.error(error)
        this.setState({ loading: false })
        return
      }

      this.setState({ loading: true })

      this.state.decentragram.methods.uploadImage(result[0].hash, description)
        .send({ from: this.state.account })
        .on('transactionHash', (hash) => {
          this.setState({ loading: false })
          window.location.reload()
        })
        .on('error', (err) => {
          console.error(err)
          this.setState({ loading: false })
        })
    })
  }

  tipImageOwner = (id, tipAmount) => {
    this.setState({ loading: true })

    this.state.decentragram.methods.tipImageOwner(id)
      .send({ from: this.state.account, value: tipAmount })
      .on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
  }

  render() {
    return (
      <div>
      
        {this.state.loading
          ? 
          <div id="loader" className="text-center mt-5">
            <img src="https://codemyui.com/wp-content/uploads/2017/11/solid-colour-slide-puzzle-style-loading-animation.gif" alt="loading gif" />
            <p>Loading...</p>
          </div>
          : 
          <div>
              <Navbar account={this.state.account} />
              <Main
                images={this.state.images}
                captureFile={this.captureFile}
                uploadImage={this.uploadImage}
                tipImageOwner={this.tipImageOwner}
              />
          </div>
        }

      </div>
    );
  }
}

export default App;
