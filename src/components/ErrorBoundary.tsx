import { Component, type ReactNode } from 'react';
import { Button, Result } from 'antd';
export default class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<Result status="error" title="页面加载失败 / Unable to load the page" subTitle="请重新加载页面。如果问题持续，请联系管理员。 / Reload the page. Contact your administrator if the problem persists." extra={<Button type="primary" onClick={()=>location.reload()}>重新加载 / Reload</Button>}/>:this.props.children;}
}
