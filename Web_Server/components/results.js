import React from 'react'
import FileResult from './fileComponent';
import Link from 'next/link';
import Button from 'react-bootstrap/Button'
import Router from 'next/router';
import ScreenshotsComponent from './screenshotsComponent';

const Result = ({action, results}) => {
    const {fileResults, pageFound, screenshots} = results;
    let actionLabel = '';
    let pageFoundLabel = '';
    let graphSection = <span></span>;
    switch(action){
        case 'upload':
            actionLabel = 'Upload';
            break;
        case 'scan':
            actionLabel = 'Scan';
            break;
    }
    
    if(pageFound){
        pageFoundLabel = <span>for <a target="_blank" href={pageFound}>{pageFound}</a></span>
    }


    let fileResultsView;
    if(fileResults != null && fileResults.length == 0){
        fileResultsView = <div>
            <p>No WebAssembly files found</p>
        </div>
    } else {
        fileResultsView =  <div>
            <br/>
            <h4>Extracted Features</h4>
            {
                fileResults.map((fileResult, idx) => <div key={'file-div-' +idx}>
                    <FileResult  fileResult={fileResult} isStat={true}></FileResult>
                    <hr/>
                </div>)
            }
        </div>
    }

    let screenshotSection = <div></div>
    if(screenshots != null){
        screenshotSection =  <div>
            <h3>Page Screenshots</h3>
            <ScreenshotsComponent screenshots={screenshots} />
        </div>
    }
     

    return (
        <div>
            <Button variant="primary" onClick={()=> Router.back()}>
                Back
            </Button>
            <br/>
            <br/>
            <h3>{actionLabel} Results {pageFoundLabel}</h3>
            {fileResultsView}
            {screenshotSection}
        </div>
    )
}

export default Result
