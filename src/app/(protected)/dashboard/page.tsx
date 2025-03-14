"use client"

import React from 'react';
import { useUser } from '@clerk/nextjs';

const DashboardPage = () => {
    const {user}=  useUser();

  return (
    <div>Welcome back , 
       {user?.firstName}
       {user?.lastName} 
      
    </div>
  )
}

export default DashboardPage;
