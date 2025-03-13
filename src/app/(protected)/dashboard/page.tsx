"use client"

import React from 'react';
import { useUser } from '@clerk/nextjs';

const DashboardPage = () => {
    const {user}=  useUser();

  return (
    <div>
       {user?.firstName}
       {user?.lastName} 
      
    </div>
  )
}

export default DashboardPage;
