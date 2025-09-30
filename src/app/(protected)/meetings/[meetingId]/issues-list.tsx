'use client'

import { ref } from 'firebase/storage'
import React from 'react'
import { api, RouterOutputs } from '@/trpc/react'
import { VideoIcon } from 'lucide-react'

type Props = {
    meetingId: string
}
const IssuesList = ({meetingId}:Props) => {
    const { data: meeting, isLoading } = api.project.getMeetingById.useQuery({ meetingId },{
        refetchInterval: 5000,
    });
    if (isLoading || !meeting) return <div>Loading...</div>
  return (
    <>
    <div className="p-8 ">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-x-8 border-b pb-6 lg:mx-0 lg:max-w-none ">

            <div className="flex items-center gap-x-6 ">
                <div className="rounded-full border bg-white p-3">
                    <VideoIcon className="h-6 w-6"/>
                </div>
                <h1>
                    <div className="text-sm  leading-6 text-gray-600">Meeting on {""}{meeting.createdAt.toLocaleDateString()}</div>
                    <div className="mt-1 text-base font-semibold leading-6 text-gray-900">{meeting.name}</div>
                </h1>
            </div>
        </div>
        <div className="h-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {meeting.issues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue}/>
                ))}
            </div>
        </div>
    </div>
    </>
  )
}

function IssueCard({issue}:{issue :NonNullable<RouterOutputs['project']['getMeetingById']>['issues'][number]}) {
    return (
        <div className="rounded-lg border p-4 shadow-sm hover:shadow-md"> Issue Card</div>
    )
}
export default IssuesList
