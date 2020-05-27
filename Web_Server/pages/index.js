import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import React, { Component } from 'react'
import Router, { withRouter } from 'next/router';
import Result from '../components/results';
import Info from '../components/infoComponent';
import ReactLoading from 'react-loading';
import { Line, Circle } from 'rc-progress';
import axios from 'axios';
import '../styles/index.css';


const TIME_TO_WAIT = 15;
const UPDATE_INTERVAL=100;
const PROGRESS_BAR_COLOR="#f2f2f2";
class Index extends Component {
    constructor(props){
        super(props);

        this.state = {
            results: null,
            action: null,
            urlToScan: '',
            urlInputError: false,
            uploadInputError: false,
            uploadLoading: false,
            urlLoading: false,
            uploadProgress: null,
            isOn: false,
            secondsLeft: 0,
            classifierType: 'neural'

        }

        this.fileInput = React.createRef();
        this.handleURLChange = this.handleURLChange.bind(this);
        this.handleUploadClick = this.handleUploadClick.bind(this);
        this.handleScanClick = this.handleScanClick.bind(this);
        this.handleURLKeyUp = this.handleURLKeyUp.bind(this);
        this.handleURLKeyDown = this.handleURLKeyDown.bind(this);
        this.hanldeUploadChange = this.hanldeUploadChange.bind(this);
        this.startTimer = this.startTimer.bind(this)
        this.stopTimer = this.stopTimer.bind(this)
        this.handleClassifierTypeChange = this.handleClassifierTypeChange.bind(this);
    }

    startTimer() {
        this.setState({
            isOn: true,
            secondsLeft: TIME_TO_WAIT,

        })

        this.timer = setInterval(() =>{ 
            const secondsLeft = this.state.secondsLeft;
            if(secondsLeft <= 0){
                this.setState({
                    isOn: false,
                })
                this.stopTimer();
            }

            this.setState({
                secondsLeft: secondsLeft - (1 * UPDATE_INTERVAL/1000) ,
            })
        }
        , UPDATE_INTERVAL);
    }

    stopTimer() {
        this.setState({isOn: false})
        clearInterval(this.timer)
    }

    UNSAFE_componentWillReceiveProps(){
        const { pathname, query } = this.props.router
        const {showResults} = query;
        const {results, action}  = this.state;

        if(pathname == '/' && showResults){
            this.setState({
                results: null,
                action: null,
                urlToScan: '',
                urlInputError: false,
                uploadInputError: false,
                uploadLoading: false,
                urlLoading: false,
                uploadProgress: null
            })
            Router.replace('/');
        }
        
    }

    componentDidMount(){
        const { pathname, query } = this.props.router
        const {showResults} = query;
        const {results, action}  =this.state;

        if(showResults && !results){
            Router.replace('/');
        }

        this.setState({
            results: null,
            action: null,
            urlToScan: '',
            urlInputError: false,
            uploadInputError: false,
            uploadLoading: false,
            urlLoading: false,
            uploadProgress: null
        })
    }

    handleURLKeyUp(e){
        this.setState({
            urlInputError: false
        });
    }

    handleURLKeyDown(e){
        if (e.key === 'Enter') {
            this.handleScanClick();
        }
    }

    hanldeUploadChange(e){
        this.setState({
            uploadInputError: false,
        });
    }

    handleUploadClick(){
        if(this.state.uploadLoading){
            return;
        }
        const router = this.props.router;
        const href = '/?showResults=1';
        const as = '/results';
        
        if(this.fileInput.current.files.length < 1){
            this.setState({uploadInputError: true});
            return;
        } 
        const file = this.fileInput.current.files[0]

        if(!file.name.endsWith('.wasm')){
            this.setState({uploadInputError: true});
            return;
        }
        this.setState({
            uploadInputError: false,
            action: 'upload',
        });
        

        const data = new FormData();
        data.append('wasm-file', file);
        data.append('action','upload');
        data.append('classifierType',this.state.classifierType);
        
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', (e) => {
            const response = xhr.response;
            this.setState({
                results: response,
                uploadLoading: false
            })
            Router.push(href, as);
        });

        xhr.upload.addEventListener("progress", event => {
            if (event.lengthComputable) {
                const uploadProgress = {
                    state: "pending",
                    percentage: (event.loaded / event.total) * 100
                };

                this.setState({ uploadProgress: uploadProgress });
            }
        });

        xhr.upload.addEventListener("load", event => {
            const uploadProgress = { state: "done", 
            percentage: 100 };
            this.setState({ uploadProgress: uploadProgress });
        });

        xhr.responseType = 'json';
        xhr.open('post', '/uploadFile'); 
        xhr.send(data)

        this.setState({
            uploadLoading: true
        })
    }

    handleURLChange(e){
        this.setState({
            urlToScan: e.target.value
        });

    }

    handleClassifierTypeChange(e){
        this.setState({
            classifierType: e.target.value
        });
    }

    handleScanClick(){
        if(this.state.urlLoading){
            return;
        }

        const href = '/?showResults=1';
        const as = '/results';
        const {action, urlToScan, classifierType} = this.state;
        //Obtained from: https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
        var expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
        var regex = new RegExp(expression);
        
        if(!urlToScan.match(regex)){
            this.setState({
                urlInputError: true
            });
            return;
        }  else {
            this.setState({
                urlInputError: false,
                action: 'scan',

            });
        }

        this.setState({
            urlLoading: true
        });

        this.startTimer();

        axios.post('/scan',{
            action: 'scan', urlToScan, classifierType
        })
        .then((response) => {
            const data = response.data;
            this.setState({
                results: data,
                urlLoading: false
            });
            Router.push(href, as);
        })
        

        
    }

    render() {
        const { pathname, query } = this.props.router
        const {results, action, urlToScan, urlInputError, uploadInputError, uploadLoading, urlLoading, uploadProgress, secondsLeft, isOn, classifierType}  = this.state;
        const {showResults} = query;
        const uploadButtonColor = uploadInputError ? 'danger' : 'primary';
        const uploadButtonText = uploadLoading? <ReactLoading type="bars" height={'100%'} width={30}/> : 'Upload'
        const urlButtonText = urlLoading? <ReactLoading type="bars" height={'100%'} width={30}/> : 'Scan'
        let uploadProgressSection = null;
        let scanProgressSection = null;

        if(uploadProgress){
            const {percentage, state} = uploadProgress
            if(state !== 'done'){
                uploadProgressSection =  <span> Upload complete</span>
            }
            uploadProgressSection = <div>
                <br/>
                <span>Upload Progress: </span>
                <br/>
                <Line percent={percentage}
                strokeWidth="2"
                strokeColor={PROGRESS_BAR_COLOR} />
            </div> 
        }

        if(urlLoading){
            const percentage = 100* (TIME_TO_WAIT - secondsLeft) / TIME_TO_WAIT;
            scanProgressSection = <div>
                <br/>
                <span>Scan Progress: </span>
                <br/>
                <Line percent={percentage}
                strokeWidth="2"
                strokeColor={PROGRESS_BAR_COLOR}
                />
                {/* strokeColor="#98C964" /> */}
            </div> 
        }

        let headerSection = (
            <div>
            </div>
            )
        const requestSection = (
            <Form>
            <Form.Row>
            <Col md="4">
                <Form.Group controlId="classifier-type-select">
                    <Form.Label>Classifer to use:</Form.Label>
                    <Form.Control as="select" value={classifierType} onChange={this.handleClassifierTypeChange}>
                    <option value="neural">Neural Network (recommended)</option>
                    <option value="random">Random Forest</option>
                    <option value="svm">SVM</option>
                    <option value="naive">Naïve Bayes</option>
                    </Form.Control>
                </Form.Group>
            </Col>
            </Form.Row>

            <br/>
            <p className="lead">Upload a WebAssembly Binary (.wasm) file here:</p>
                <input onChange={this.hanldeUploadChange} ref={this.fileInput} type="file" name="wasm-file"/>
                <br/>
                <br/>
                <Form.Group >
                        <Form.Control isInvalid={uploadInputError}
                                    style={{ height: '0px', padding: '0px', margin: '0px', border: 'none'}} />
                        <Button variant={uploadButtonColor} type="button" onClick={this.handleUploadClick}>
                            {uploadButtonText}
                        </Button>
                        
                        {uploadProgressSection}
                        <Form.Control.Feedback type="invalid">
                            Please choose a valid WebAssembly file
                        </Form.Control.Feedback>
                </Form.Group>
                <hr />
                <p></p>
                    <Form.Group controlId="urlToScan">
                        <Form.Label className="lead">Enter a URL to scan here:</Form.Label>
                        <Form.Control isInvalid={urlInputError}
                                    placeholder="http://example.com"
                                        accept=".wasm" 
                                        value={urlToScan}
                                        onChange={this.handleURLChange}
                                        onKeyUp={this.handleURLKeyUp}
                                        onKeyDown={this.handleURLKeyDown}
                                        maxLength={1900}
                                        />
                        {scanProgressSection}

                        <Form.Control.Feedback type="invalid">
                            Please provide a valid URL
                        </Form.Control.Feedback>
                    </Form.Group>
                <p>
                <Button variant="primary" type="button" onClick={this.handleScanClick}>
                    {urlButtonText}
                </Button>
                </p>
            </Form>
        )

        const resultsSection = !results ? <span></span> : 
        (<Result action={action} results={results}></Result>);

        const mainSection = !showResults ? requestSection : resultsSection
        return (
            <div>
                <Container>
                    {headerSection}
                    {mainSection}
                    <Info />
                </Container>
            </div>
        )
    }
}

export default withRouter(Index);