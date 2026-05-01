import { Button } from "./ui/button";

export default function DownloadCompletedToast({
  filePath,
}: {
  filePath: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="">Download Completed</h3>
      <div className="flex flex-row gap-2 items-center">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOpenFile(filePath)}
        >
          Open File
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleOpenFileLocation(filePath)}
        >
          Open File Location
        </Button>
      </div>
    </div>
  );
}

function handleOpenFile(filePath: string) {
  console.log("Open file");
}

function handleOpenFileLocation(filePath: string) {
  console.log("Open file location");
}
