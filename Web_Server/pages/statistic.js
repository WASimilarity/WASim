import React, { Component } from 'react'
import { useRouter, withRouter} from 'next/router';
import axios from 'axios';
import FileResult from '../components/fileComponent';


class StatisticPage extends Component {
  constructor(props){
    super(props);

    this.state = {
      features: null,
      sites:[]
    };

  }

  componentDidMount(){
    const {router} = this.props

    let postBody;
    if(router.query.purpose == null){
      const paramValues = router.asPath.split('/')

      postBody = {
        purpose: paramValues[2].replace(/%20/g,' '),
        stat: paramValues[3],
        metric:paramValues[4]
      }
    } else {
      postBody = router.query
    }
    axios.post('/getStatDetails', postBody)
    .then((results) => {

      if(results != null && results.data != null){
        this.setState({
          features: results.data.features,
          sites: results.data.sitesUsed
        })
      }
      
    })

    

  }
  render() {
    const {features,sites} = this.state;

    let featureSection = <span></span>
    let sitesSection = <span></span>
    if(features != null){
      featureSection = <FileResult fileResult={features} isStat={true} />
      const siteElems = sites.map(site => {
        const link = site.Page.includes('http') ? site.Page : 'http://' + site.Page
        return <a  rel="noreferrer" target="_blank"  href={link}>{link}&nbsp;</a>
      })
      sitesSection = <div>Used on {siteElems}</div>
    }
    return (
      <div>
        {sitesSection}
        {featureSection}
      </div>
  );
  }
}




export default withRouter(StatisticPage) ;