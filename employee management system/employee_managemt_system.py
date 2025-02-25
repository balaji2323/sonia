import os
print("Current Working Directory:", os.getcwd())


import sys
print(sys.executable)


from tkinter import*
from tkinter import ttk
from PIL import Image,ImageTk
import mysql.connector
from tkinter import messagebox
class Employee:
    def __init__(self,root):
        self.root=root
        self.root.geometry("1530x790+0+0")
        self.root.title("Employee Management System")

        #variables
        self.var_dep=StringVar()
        self.var_name=StringVar()
        self.var_designation=StringVar()
        self.var_email=StringVar()
        self.var_address=StringVar()
        self.var_married=StringVar()
        self.var_dob=StringVar()
        self.var_doj=StringVar()
        self.var_idproofcomb=StringVar()
        self.var_idproof=StringVar()
        self.var_gender=StringVar()
        self.var_phone=StringVar()
        self.var_country=StringVar()
        self.var_salary=StringVar()


    
        lbl_title=Label(self.root,text='EMPLOYEE MANAGEMT SYSTEM',font=('times new roman',37,'bold'),fg='darkblue',bg='white')
        lbl_title.place(x=0,y=0,width=1530,height=50)
        #logo
        from PIL import Image  
        img_logo = Image.open("emp1.jpeg")  # Use forward slashes `/`
        img_logo = img_logo.resize((50, 50), Image.Resampling.LANCZOS)  # ✅ NEW (Works in Pillow 10+)
        self.photo_logo=ImageTk.PhotoImage(img_logo)

        self.logo=Label(self.root,image=self.photo_logo)
        self.logo.place(x=270,y=0,width=50, height=50)

        img_frame=Frame(self.root,bd=2,relief=RIDGE,bg='white')
        img_frame.place(x=0,y=50,width=1530,height=160)
        #1st
        from PIL import Image  
        img_1 = Image.open("img 6.webp")  # Use forward slashes `/`
        img_1 = img_1.resize((540, 160), Image.Resampling.LANCZOS)  # ✅ NEW (Works in Pillow 10+)
        self.photo1=ImageTk.PhotoImage(img_1)

        self.img_1=Label(img_frame,image=self.photo1)
        self.img_1.place(x=0,y=0,width=540, height=160)
        #2nd
        
        #3rd
        from PIL import Image  
        img_3 = Image.open("img4.png")  # Use forward slashes `/`
        img_3 = img_3.resize((540, 160), Image.Resampling.LANCZOS)  # ✅ NEW (Works in Pillow 10+)
        self.photo_photo2=ImageTk.PhotoImage(img_3)

        self.img_3=Label(img_frame,image=self.photo_photo2)
        self.img_3.place(x=1000,y=0,width=540, height=160)


        #main frame

        main_frame=Frame(self.root,bd=2,relief=RIDGE,bg='white')
        main_frame.place(x=10,y=220,width=1500,height=560)

        #upper frame

        upper_frame=LabelFrame(main_frame,bd=2,relief=RIDGE,bg='white',text='Employee Information',font=('times new roman',11,'bold'),fg='red')
        upper_frame.place(x=10,y=10,width=1480,height=270)

        #label and entry
        lbl_dep=Label(upper_frame,text='Department',font=('arial',11,'bold'),bg='white')
        lbl_dep.grid(row=0,column=0,padx=2,sticky=W)

        #down frame
        down_frame=LabelFrame(main_frame,bd=2,relief=RIDGE,bg='white',text='Employee Information',font=('arial',11,'bold'),fg='red')
        down_frame.place(x=10,y=280,width=1480,height=270)
        
        combo_dep=ttk.Combobox(upper_frame,textvariable=self.var_dep,font=('arial',12,'bold'),width=17,state='readonly')
        combo_dep['value']=('Select Department','HR','Software Engineer','Manager')
        combo_dep.current(0)
        combo_dep.grid(row=0,column=1,padx=2,pady=10,sticky=W)

        #name
        lbl_name=Label(upper_frame,font=('arial',12,'bold'),text="Name:",bg='white')
        lbl_name.grid(row=0,column=2,sticky=W,padx=2,pady=7)
        
        txt_name=ttk.Entry(upper_frame,textvariable=self.var_name,width=22,font=('arial',11,'bold'))
        txt_name.grid(row=0,column=3,padx=2,pady=7)

        #lbl_Designation
        lbl_doj=Label(upper_frame,font=('arial',12,'bold'),text="Designation:",bg="white")
        lbl_doj.grid(row=1,column=0,padx=2,pady=7,sticky=W)

        txt_doj=ttk.Entry(upper_frame,textvariable=self.var_designation,width=22,font=('arial',11,'bold'))
        txt_doj.grid(row=1,column=1,padx=2,pady=7,sticky=W)
        

        #email
        lbl_email=Label(upper_frame,font=('arial',12,'bold'),text="email:",bg='white')
        lbl_email.grid(row=1,column=2,padx=2,sticky=W,pady=7)
        
        txt_email=ttk.Entry(upper_frame,textvariable=self.var_email,width=22,font=('arial',11,'bold'))
        txt_email.grid(row=1,column=3,padx=2,pady=7)

        #address
        lbl_address=Label(upper_frame,font=('arial',12,'bold'),text="Address:",bg="white")
        lbl_address.grid(row=2,column=0,padx=2,sticky=W,pady=7)

        txt_address=ttk.Entry(upper_frame,textvariable=self.var_address,width=22,font=('arial',11,'bold'))
        txt_address.grid(row=2,column=1,padx=2,pady=7)



        #married
        lbl_married=Label(upper_frame,font=('arial',12,'bold'),text="Married Status",bg='white')
        lbl_married.grid(row=2,column=2,padx=2,sticky=W,pady=7)
        
        combo_dep=ttk.Combobox(upper_frame,textvariable=self.var_married,state="readonly",font=('arial',12,'bold'),width=17)
        combo_dep['value']=("Married","Unmarried")
        combo_dep.current(0)
        combo_dep.grid(row=2,column=3,padx=2,pady=7,sticky=W)

        #dob
        lbl_dob=Label(upper_frame,font=('arial',12,'bold'),text="DOB:",bg="white")
        lbl_dob.grid(row=3,column=0,padx=2,sticky=W,pady=7)

        txt_dob=ttk.Entry(upper_frame,textvariable=self.var_dob,width=22,font=('arial',11,'bold'))
        txt_dob.grid(row=3,column=1,padx=2,pady=7)

        #doj
        lbl_doj=Label(upper_frame,font=('arial',12,'bold'),text="DOJ:",bg="white")
        lbl_doj.grid(row=3,column=2,padx=2,sticky=W,pady=7)

        txt_doj=ttk.Entry(upper_frame,textvariable=self.var_doj,width=22,font=('arial',11,'bold'))
        txt_doj.grid(row=3,column=3,padx=2,pady=7)

        #id proof
        combo_dep=ttk.Combobox(upper_frame,textvariable=self.var_idproofcomb,state="readonly",font=('arial',12,'bold'),width=17)
        combo_dep['value']=("Select Id proof","PAN CARD","AADHAR CARD","RATION CARD")
        combo_dep.current(0)
        combo_dep.grid(row=4,column=0,padx=2,pady=7,sticky=W)

        txt_doj=ttk.Entry(upper_frame,textvariable=self.var_idproof,width=22,font=('arial',11,'bold'))
        txt_doj.grid(row=4,column=1,padx=2,pady=7)
        
        #gender
        lbl_doj=Label(upper_frame,font=('arial',12,'bold'),text="Gender:",bg="white")
        lbl_doj.grid(row=4,column=2,padx=2,sticky=W,pady=7)

        combo_dep=ttk.Combobox(upper_frame,textvariable=self.var_gender,state="readonly",font=('arial',12,'bold'),width=17)
        combo_dep['value']=("Male","Female","other")
        combo_dep.current(0)
        combo_dep.grid(row=4,column=3,padx=2,pady=7,sticky=W)

        #phone
        lbl_phone=Label(upper_frame,font=('arial',12,'bold'),text="Phone No:",bg="white")
        lbl_phone.grid(row=0,column=4,padx=2,pady=7,sticky=W)

        txt_phone=ttk.Entry(upper_frame,textvariable=self.var_phone,width=22,font=('arial',11,'bold'))
        txt_phone.grid(row=0,column=5,padx=2,pady=7)

        #country
        lbl_country=Label(upper_frame,font=('arial',12,'bold'),text="Country:",bg="white")
        lbl_country.grid(row=1,column=4,padx=2,sticky=W,pady=7)

        txt_country=ttk.Entry(upper_frame,textvariable=self.var_country,width=22,font=('arial',11,'bold'))
        txt_country.grid(row=1,column=5,padx=2,pady=7)

        #ctc
        lbl_ctc=Label(upper_frame,font=('arial',12,'bold'),text="salary:",bg="white")
        lbl_ctc.grid(row=2,column=4,padx=2,sticky=W,pady=7)

        txt_ctc =ttk.Entry(upper_frame,textvariable=self.var_salary,width=22,font=('arial',11,'bold'))
        txt_ctc.grid(row=2,column=5,padx=2,pady=7)

        from PIL import Image  
        img_2 = Image.open("img 8.webp")  # Use forward slashes `/`
        img_2 = img_2.resize((220, 220), Image.Resampling.LANCZOS)  # ✅ NEW (Works in Pillow 10+)
        self.photo2=ImageTk.PhotoImage(img_2)

        self.img_2=Label(upper_frame,image=self.photo2)
        self.img_2.place(x=1000,y=0,width=220, height=220)

        #button
        button_frame=Frame(upper_frame,bd=2,relief=RIDGE,bg='white')
        button_frame.place(x=1290,y=20,width=170,height=210)

        btn_add=Button(button_frame,text="Save",command=self.add_data,font=("arial",15,"bold"),width=13,bg="blue",fg="white")
        btn_add.grid(row=0,column=0,padx=1,pady=5)

        btn_add=Button(button_frame,text="update",command=self.update_data,font=("arial",15,"bold"),width=13,bg="blue",fg="white")
        btn_add.grid(row=1,column=0,padx=1,pady=5)

        btn_add=Button(button_frame,text="delete",command=self.delete_data,font=("arial",15,"bold"),width=13,bg="blue",fg="white")
        btn_add.grid(row=2,column=0,padx=1,pady=5)

        btn_add=Button(button_frame,text="clear",command=self.reset_data,font=("arial",15,"bold"),width=13,bg="blue",fg="white")
        btn_add.grid(row=3,column=0,padx=1,pady=5)

        #down frame
        down_frame=LabelFrame(main_frame,bd=2,relief=RIDGE,bg='white',text="employee Info Table",font=("times new roman",11,"bold"),fg="red")
        down_frame.place(x=10,y=280,width=1480,height=270)
        
        #search frame
        search_frame=LabelFrame(down_frame,bd=2,relief=RIDGE,bg='white',text="Search employee Information",font=("times new roman",11,"bold"),fg="red")
        search_frame.place(x=0,y=0,width=1470,height=60)

        search_by=Label(search_frame,bg='red',text="Search By",font=("arial",11,"bold"),fg="white")
        search_by.grid(row=0,column=0,sticky=W,padx=5)
        
        #search
        self.var_com_search=StringVar()
        com_txt_search=ttk.Combobox(search_frame,textvariable=self.var_com_search,state="readonly",font=('arial',12,'bold'),width=17)
        com_txt_search['value']=("Select Option","Phone","id_proof")
        com_txt_search.current(0)
        com_txt_search.grid(row=0,column=1,padx=5,sticky=W)
        self.var_search=StringVar()
        txt_search=ttk.Entry(search_frame,textvariable=self.var_search,width=22,font=('arial',11,'bold'))
        txt_search.grid(row=0,column=2,padx=5)

        btn_search=Button(search_frame,text="Search",command=self.search_data,font=("arial",15,"bold"),width=13,bg="blue",fg="white")
        btn_search.grid(row=0,column=3,padx=5)

        btn_ShowAll=Button(search_frame,text="Show All",command=self.fetch_data,font=("arial",15,"bold"),width=13,bg="blue",fg="white")
        btn_ShowAll.grid(row=0,column=4,padx=5)

        

        #employee table
        table_frame=Frame(down_frame,bd=3,relief=RIDGE)
        table_frame.place(x=0,y=60,width=1470,height=170)


        scroll_x=ttk.Scrollbar(table_frame,orient=HORIZONTAL)
        scroll_y=ttk.Scrollbar(table_frame,orient=HORIZONTAL)

        self.employee_table=ttk.Treeview(table_frame,column=("dep","name","degi","email","address","married","dob","doj","idproofcomb","idproof","gender","phone","country","salary",),xscrollcommand=scroll_x.set,yscrollcommand=scroll_y.set)

        scroll_x.pack(side=BOTTOM,fill=X)
        scroll_y.pack(side=RIGHT,fill=Y)

        scroll_x.config(command=self.employee_table.xview)
        scroll_y.config(command=self.employee_table.yview)

        self.employee_table.heading('dep',text='Department')
        self.employee_table.heading('name',text='name')
        self.employee_table.heading('degi',text='Degignition')
        self.employee_table.heading('email',text='Email')
        self.employee_table.heading('address',text='Address')
        self.employee_table.heading('married',text='Married Status')
        self.employee_table.heading('dob',text='DOB')
        self.employee_table.heading('doj',text='DOJ')
        self.employee_table.heading('idproofcomb',text='ID TYPE')
        self.employee_table.heading('idproof',text='ID PROOF')
        self.employee_table.heading('gender',text='GENDER')
        self.employee_table.heading('phone',text='PHONE')
        self.employee_table.heading('country',text='COUNTRY')
        self.employee_table.heading('salary',text='SALARY')

        self.employee_table['show']='headings'
        self.employee_table.column('dep',width=100)
        self.employee_table.column('name',width=100)
        self.employee_table.column('degi',width=100)
        self.employee_table.column('email',width=100)
        self.employee_table.column('address',width=100)
        self.employee_table.column('married',width=100)
        self.employee_table.column('dob',width=100)
        self.employee_table.column('doj',width=100)
        self.employee_table.column('idproofcomb',width=100)
        self.employee_table.column('idproof',width=100)
        self.employee_table.column('gender',width=100)
        self.employee_table.column('phone',width=100)
        self.employee_table.column('country',width=100)
        self.employee_table.column('salary',width=100)
   

        

        self.employee_table.pack(fill=BOTH,expand=1)
        self.employee_table.bind("<ButtonRelease>",self.get_cursor)

        self.fetch_data()

    #function declarations

    def add_data(self):
        if self.var_dep.get()=="" or self.var_email.get=="":
            messagebox.showerror("Error","Please fill all fields")
        else:
            try:
                conn=mysql.connector.connect(host='localhost',username='root',password='Balaji@970',database='data')    
                my_cursor=conn.cursor()
                my_cursor.execute('Insert into employee1 values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',(

                                                                                                              
                                                                                                               self.var_dep.get(),
                                                                                                               self.var_name.get(),
                                                                                                               self.var_designation.get(),
                                                                                                               self.var_email.get(),
                                                                                                               self.var_address.get(),
                                                                                                               self.var_married.get(),
                                                                                                               self.var_dob.get(),
                                                                                                               self.var_doj.get(),
                                                                                                               self.var_idproof.get(),
                                                                                                               self.var_idproofcomb.get(),
                                                                                                        
                                                                                                               self.var_gender.get(),
                                                                                                               self.var_phone.get(),
                                                                                                               self.var_country.get(),
                                                                                                               self.var_salary.get()
                                                                                                               
 
         
                                                                                                            ))
                
                conn.commit()
                self.fetch_data()
                conn.close()
                messagebox.showinfo('Success','Employee has been addees!',parent=self.root)

            except Exception as es:
                messagebox.showerror('Error',f'Due to:{str(es)}',parent=self.root)

        


    #fetch data
    def fetch_data(self): 
        conn=mysql.connector.connect(host='localhost',username='root',password='Balaji@970',database='data')    
        my_cursor=conn.cursor() 
        my_cursor.execute('select * from employee1') 
        data=my_cursor.fetchall()
        if len(data)!=0:
            self.employee_table.delete(*self.employee_table.get_children())
            for i in data:
                self.employee_table.insert('',END,values=i)
            conn.commit     
        conn.close()     
    #get cursor
    def get_cursor(self,event=""):
        cursor_row=self.employee_table.focus()
        content=self.employee_table.item(cursor_row)    
        data=content['values']

        self.var_dep.set(data[0])
        self.var_name.set(data[1])
        self.var_designation.set(data[2])
        self.var_email.set(data[3])
        self.var_address.set(data[4])
        self.var_married.set(data[5])
        self.var_dob.set(data[6])
        self.var_doj.set(data[7])
        self.var_idproof.set(data[8])
        self.var_idproofcomb.set(data[9])
        self.var_gender.set(data[10])
        self.var_phone.set(data[11])
        self.var_country.set(data[12])
        self.var_salary.set(data[13])


    def update_data(self):
        if self.var_dep.get()=="" or self.var_email.get()=="":
            messagebox.showerror("Error","Please fill all fields")
        else:
            try:
                update=messagebox.askyesno('Update','Are you sure update this employee data')
                if update>0:
                    conn=mysql.connector.connect(host='localhost',username='root',password='Balaji@970',database='data')    
                    my_cursor=conn.cursor()
                    my_cursor.execute('update employee1 set Department=%s,Name=%s,Desiignation=%s,Email=%s,Address=%s,Married_status=%s,DOB=%s,DOJ=%s,id_proof_type=%s,Gender=%s,Phone=%s,Country=%s,Salary=%s where id_proof = %s',(
                                                                                                                                                                                                                    self.var_dep.get(),
                                                                                                                                                                                                                    self.var_name.get(),
                                                                                                                                                                                                                    self.var_designation.get(),
                                                                                                                                                                                                                    self.var_email.get(),
                                                                                                                                                                                                                    self.var_address.get(),
                                                                                                                                                                                                                    self.var_married.get(),
                                                                                                                                                                                                                    self.var_dob.get(),
                                                                                                                                                                                                                    self.var_doj.get(),
                                                                                                                                                                                                                    
                                                                                                                                                                                                                    self.var_idproofcomb.get(),
                                                                                                                                                                                                                
                                                                                                                                                                                                                    self.var_gender.get(),
                                                                                                                                                                                                                    self.var_phone.get(),
                                                                                                                                                                                                                    self.var_country.get(),
                                                                                                                                                                                                                    self.var_salary.get(),
                                                                                                                                                                                                                    self.var_idproof.get()
                                                                                                                                                                                   




                                                                                                                                                                                                                ))
                else:
                    if not update:
                        return 
                conn.commit()        
                self.fetch_data()
                conn.close()
                messagebox.showinfo('Success',"Employee data updated successfully",parent=self.root)
            except Exception as es:
                 messagebox.showerror('Error',f'Due to:{str(es)}',parent=self.root)


    #delete
    def delete_data(self):
        if self.var_idproof.get()=="":
            messagebox.showerror("Error","All fields are required")
        else:
            try:
                Delete=messagebox.askyesno('Delete','Are you sure delete this employee data')
                if Delete>0:
                    conn=mysql.connector.connect(host='localhost',username='root',password='Balaji@970',database='data')    
                    my_cursor=conn.cursor()
                    sql='delete from employee1 where id_proof=%s'
                    value=(self.var_idproof.get(),)
                    my_cursor.execute(sql,value)
                else:
                    if not Delete:
                        return
                conn.commit()
                self.fetch_data()
                conn.close() 
                messagebox.showinfo('Delete',"Employee data Deleted successfully",parent=self.root)
            except Exception as es:
                messagebox.showerror('Error',f'Due to:{str(es)}',parent=self.root)            

    #clear
    def reset_data(self):
        self.var_dep.set("Select Department")
        self.var_name.set()
        self.var_designation.set()
        self.var_email.set()
        self.var_address.set()
        self.var_married.set("Married")
        self.var_dob.set()
        self.var_doj.set()
        self.var_idproof.set()
        self.var_idproofcomb.set("Select Id Proof")
        self.var_gender.set()
        self.var_phone.set()
        self.var_country.set()
        self.var_salary.set()
    #search
    def search_data(self):
        if self.var_com_search.get()=='' or self.var_search.get()=='':
            messagebox.showerror('Error','Please select option')
        else:
            try:
                conn=mysql.connector.connect(host='localhost',username='root',password='Balaji@970',database='data')    
                my_cursor=conn.cursor()
                my_cursor.execute('select *from employee1 where ' +str(self.var_com_search.get())+" LIKE '%"+str(self.var_search.get()+"%'"))
                rows=my_cursor.fetchall()
                if len(rows)!=0:
                    self.employee_table.delete(*self.employee_table.get_children())
                    for i in rows:
                        self.employee_table.insert('',END,values=i)
                conn.commit()
                conn.close() 
            except Exception as es:
                messagebox.showerror('Error',f'Due to:{str(es)}',parent=self.root)             





        






























        




        







        

      
      





       
if __name__=="__main__":
    root=Tk()
    obj=Employee(root)
    root.mainloop()        
    