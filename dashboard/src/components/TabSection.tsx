import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import ReadTab from "./tabs/ReadTab";
import AdminTab from "./tabs/admin/AdminTab";
import UserTab from "./tabs/UserTab";

export default function TabsSection({
  vaultAddress,
}: {
  vaultAddress: `0x${string}`;
}) {
  return (
    <TabGroup>
      <TabList className="flex space-x-1 bg-chainlink-dark border border-chainlink-light-blue rounded-t-lg">
        <Tab
          className={({ selected }) =>
            `w-full py-2.5 text-sm font-medium leading-5 text-chainlink-light ${
              selected ? "bg-chainlink-blue" : "hover:bg-chainlink-light-blue"
            }`
          }
        >
          Read
        </Tab>
        <Tab
          className={({ selected }) =>
            `w-full py-2.5 text-sm font-medium leading-5 text-chainlink-light ${
              selected ? "bg-chainlink-blue" : "hover:bg-chainlink-light-blue"
            }`
          }
        >
          Admin
        </Tab>
        <Tab
          className={({ selected }) =>
            `w-full py-2.5 text-sm font-medium leading-5 text-chainlink-light ${
              selected ? "bg-chainlink-blue" : "hover:bg-chainlink-light-blue"
            }`
          }
        >
          User
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <ReadTab vaultAddress={vaultAddress} />
        </TabPanel>
        <TabPanel>
          <AdminTab vaultAddress={vaultAddress} />
        </TabPanel>
        <TabPanel>
          <UserTab vaultAddress={vaultAddress} />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}
