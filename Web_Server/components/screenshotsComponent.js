import React, {useState} from 'react';
import Carousel from 'react-bootstrap/Carousel'

const ScreenshotComponent = ({screenshots}) => {
    if(screenshots.length == 0){
        return <div></div>;
    }

    const [index, setIndex] = useState(0);
    const handleSelect = (selectedIndex, e) => {
        setIndex(selectedIndex);
    };
    return (
        <div>   
            <Carousel activeIndex={index} onSelect={handleSelect} >
                {screenshots.map((encodedScreenshot, screenshotIndex) => {
                    const base64String = 'data:image/png;base64,'+ encodedScreenshot;
                    return <Carousel.Item key={'screenshot-item-' + screenshotIndex}>
                    <img
                        className="d-block w-100"
                        src={base64String}
                        alt={`Screenshot ${screenshotIndex + 1}`}
                    />
                </Carousel.Item>
                })}
                
            </Carousel> 
        </div>
    )
}

export default ScreenshotComponent;