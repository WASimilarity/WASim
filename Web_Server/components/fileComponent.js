import React, { useState }  from 'react'
import Jumbotron from 'react-bootstrap/Jumbotron'
import Button from 'react-bootstrap/Button'
import Collapse from 'react-bootstrap/Collapse'
import Link from 'next/link';

const FileResult = ({fileResult, isStat}) => {
    const [open, setOpen] = useState(false);
    const formatProbability = (probabilityFloat) => (probabilityFloat * 100).toFixed(2)
    const {
            labels,
            error,
            OriginalUploadFilename,
            FileHash,
            ImportFunctions,
            ExportFunctions,
            NumberOfFunctions,
            WasmFileSize,
            WatFileSize,
            ExpansionFactor,
            IsAsm,
            TotalLinesOfCode,
            MinFunctionLinesOfCode,
            MaxFunctionLinesOfCode,
            AvgFunctionLinesOfCode,
            NumberOfTypes,
            NumberOfImports,
            NumberOfExports,
            NumberOfDataSections,
            NumberOfTableEntries
        } = fileResult
    if(error){
        return  <div>
                    <h3>{OriginalUploadFilename}</h3>
                    <h6>Sorry, there was an error!</h6>
                </div>
    }


    let numberOfFunctionStatLabel = NumberOfFunctions ;
    let wasmFileSizeStatLabel = WasmFileSize;
    let watFileSizeStatLabel = WatFileSize;
    const mostLikelyLabel = labels[0][0];
    const mostLikelyLabelProbability = labels[0][1];
    const nextTopThreeLabels = labels.slice(1,4);
    let labelDetailsSection = <span></span>;

    if(mostLikelyLabel != ''){
        const statPage = 'statistic';
        numberOfFunctionStatLabel = <span> {NumberOfFunctions}
            </span>
        wasmFileSizeStatLabel = <span> {WasmFileSize}&nbsp;
            </span>
        watFileSizeStatLabel = <span> {WatFileSize}
            </span>
        
        let otherProbabilitiesSection = <span></span>;
        if(mostLikelyLabelProbability < 0.95){
            otherProbabilitiesSection = <div>
                    <Button
                        variant="outline-primary"
                        onClick={() => setOpen(!open)}
                        aria-controls="collapse-purpose-probabilities"
                        aria-expanded={open}
                    >
                        {open ? 'Hide probabilities' : 'Show all probabilties'}
                    </Button>
                    <Collapse in={open}>
                        <div id="collapsed-probabilities" style={{
                            paddingTop: '8px'
                        }}>
                        {nextTopThreeLabels.map((mostLikelyLabel) => {
                            const [label, probability] = mostLikelyLabel;
                            return <div key={"probability-div-" + label}>{label} ({formatProbability(probability)}%)<br/></div>
                        })}
                        </div>
                    </Collapse>
            </div>
        }
        labelDetailsSection = <div>
            <h4>{mostLikelyLabel} ({formatProbability(mostLikelyLabelProbability)}%)</h4>
            {otherProbabilitiesSection}
        </div>
    }
    
    const isAsmLabel = IsAsm === true ? 'Yes' : 'No'
    const leftColumnStyle = 'col-sm-4';
    const rightColumnStyle = "col-sm-8";
    return (
        <div>
            <Jumbotron style={{
                backgroundColor: '#e9e9e9',
                //backgroundColor: '#E2DEFF',
                borderRadius: '5px',
                padding: '2rem 2rem'

            }}>
            <h4>{OriginalUploadFilename}</h4>
            <dl className="row">
                <dt className={leftColumnStyle}>
                    Purpose
                </dt>
                <dd className={rightColumnStyle}>
                    {labelDetailsSection}
                </dd>

                <dt className={leftColumnStyle} >
                    Import Functions
                </dt>
                <dd className={rightColumnStyle} style={{
                    wordWrap: 'break-word'
                }}>
                    <span>{ImportFunctions}</span>
                </dd>

                <dt className={leftColumnStyle} >
                    Export Functions
                </dt>
                <dd className={rightColumnStyle} style={{
                    wordWrap: 'break-word'
                }} >
                    <span>{ExportFunctions}</span>
                </dd>

                <dt className={leftColumnStyle}>
                    Number of Functions 
                </dt>
                <dd className={rightColumnStyle}>
                    <span>
                    {numberOfFunctionStatLabel}
                    </span>
                </dd>

                <dt className={leftColumnStyle}>
                    Binary(.wasm) File Size (in KB)
                </dt>
                <dd className={rightColumnStyle}>
                    <span>
                        {wasmFileSizeStatLabel}
                    </span>
                </dd>

                <dt className={leftColumnStyle}>
                    Text(.wat) File Size (in KB)
                </dt>
                <dd className={rightColumnStyle}>
                    <span>
                        {watFileSizeStatLabel}
                    </span>
                </dd>

                <dt className={leftColumnStyle}>
                    Expansion Factor
                </dt>
                <dd className={rightColumnStyle}>
                    {ExpansionFactor}
                </dd>

                <dt className={leftColumnStyle}>
                    Is an Asm.js WebAssembly module
                </dt>
                <dd className={rightColumnStyle}>
                    { isAsmLabel}
                    
                </dd>
                
                <dt className={leftColumnStyle}>
                    Total Lines of Code
                </dt>
                <dd className={rightColumnStyle}>
                    {TotalLinesOfCode}
                </dd>

                <dt className={leftColumnStyle}>
                    Minimum Function Lines of Code
                </dt>
                <dd className={rightColumnStyle}>
                    {MinFunctionLinesOfCode}
                </dd>

                <dt className={leftColumnStyle}>
                    Maximum Function Lines of Code
                </dt>
                <dd className={rightColumnStyle}>
                    {MaxFunctionLinesOfCode}
                </dd>

                <dt className={leftColumnStyle}>
                    Average Function Lines of Code
                </dt>
                <dd className={rightColumnStyle}>
                    {AvgFunctionLinesOfCode}
                </dd>

                <dt className={leftColumnStyle}>
                    Number of Types
                </dt>
                <dd className={rightColumnStyle}>
                    {NumberOfTypes}
                </dd>

                <dt className={leftColumnStyle}>
                    Number of Import Functions
                </dt>
                <dd className={rightColumnStyle}>
                    {NumberOfImports}
                </dd>

                <dt className={leftColumnStyle}>
                    Number of Export Functions
                </dt>
                <dd className={rightColumnStyle}>
                    {NumberOfExports}
                </dd>

                <dt className={leftColumnStyle}>
                    Number of Data Sections
                </dt>
                <dd className={rightColumnStyle}>
                    {NumberOfDataSections}
                </dd>

                <dt className={leftColumnStyle}>
                    Number of Table Entries
                </dt>
                <dd className={rightColumnStyle}>
                    {NumberOfTableEntries}
                </dd>
            </dl>
            </Jumbotron>
        </div>
    )
}

export default FileResult
