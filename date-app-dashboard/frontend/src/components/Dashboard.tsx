import React from 'react';
import Shop from './Shop';
import Fundraiser from './Fundraiser';
import Marketing from './Marketing';
import Auth from './Auth';

export default function Dashboard() {
  return (
    <div>
      <h1>Date App DAO Dashboard</h1>
      <Auth />
      <Shop />
      <Fundraiser />
      <Marketing />
    </div>
  );
}